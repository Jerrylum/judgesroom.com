import type {
  RouterDefinition,
  InferClient,
  CreateClientOptions,
  WRPCRequest,
  WRPCResponse
} from '@judging.jerryio/worker/src/types';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  type: 'query' | 'mutation';
}

interface ActiveSubscription {
  observer: {
    onData?: (data: unknown) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
  };
  unsubscribe: () => void;
}

export class WRPCClient<TRouter extends RouterDefinition> {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private activeSubscriptions = new Map<string, ActiveSubscription>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private options: CreateClientOptions) { }

  private generateRequestId(): string {
    return `req_${++this.requestId}_${Date.now()}`;
  }

  private async connect(): Promise<WebSocket> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    return new Promise((resolve, reject) => {
      const { wsUrl, sessionId, clientId, deviceName } = this.options;
      const url = new URL(wsUrl);

      if (sessionId) url.searchParams.set('sessionId', sessionId);
      if (clientId) url.searchParams.set('clientId', clientId);
      if (deviceName) url.searchParams.set('deviceName', deviceName);
      url.searchParams.set('action', 'join');

      const ws = new WebSocket(url.toString());

      ws.onopen = () => {
        this.ws = ws;
        this.reconnectAttempts = 0;
        resolve(ws);
      };

      ws.onerror = (error) => {
        reject(new Error(`WebSocket connection failed: ${error}`));
      };

      ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      ws.onclose = (event) => {
        this.handleClose(event);
      };
    });
  }

  private handleMessage(data: string): void {
    try {
      const response: WRPCResponse = JSON.parse(data);

      // Handle regular request/response
      const pendingRequest = this.pendingRequests.get(response.id);
      if (pendingRequest) {
        this.pendingRequests.delete(response.id);

        if (response.result?.type === 'error') {
          const error = new Error(response.result.error?.message || 'Unknown error');
          (error as Error & { code?: string }).code = response.result.error?.code;
          pendingRequest.reject(error);
        } else if (response.result?.type === 'data') {
          pendingRequest.resolve(response.result.data);
        }
        return;
      }

      // Handle subscription
      const subscription = this.activeSubscriptions.get(response.id);
      if (subscription) {
        if (response.result?.type === 'error') {
          const error = new Error(response.result.error?.message || 'Subscription error');
          (error as Error & { code?: string }).code = response.result.error?.code;
          subscription.observer.onError?.(error);
        } else if (response.result?.type === 'data') {
          subscription.observer.onData?.(response.result.data);
        } else if (response.result?.type === 'complete') {
          subscription.observer.onComplete?.();
          this.activeSubscriptions.delete(response.id);
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private async handleClose(event: CloseEvent): Promise<void> {
    this.ws = null;

    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      request.reject(new Error('WebSocket connection closed'));
    }
    this.pendingRequests.clear();

    // Notify subscriptions of disconnection
    for (const [id, subscription] of this.activeSubscriptions) {
      subscription.observer.onError?.(new Error('WebSocket connection closed'));
    }

    // Attempt to reconnect if not intentionally closed
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect().catch(console.error);
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  private async sendRequest(request: WRPCRequest): Promise<unknown> {
    const ws = await this.connect();

    if (request.type === 'subscription') {
      // Subscriptions are handled differently - they don't return promises
      ws.send(JSON.stringify(request));
      return;
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        type: request.type as 'query' | 'mutation'
      });
      ws.send(JSON.stringify(request));

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 seconds timeout
    });
  }

  query(path: string, input: unknown): Promise<unknown> {
    const request: WRPCRequest = {
      id: this.generateRequestId(),
      type: 'query',
      path,
      input,
    };
    return this.sendRequest(request);
  }

  mutation(path: string, input: unknown): Promise<unknown> {
    const request: WRPCRequest = {
      id: this.generateRequestId(),
      type: 'mutation',
      path,
      input,
    };
    return this.sendRequest(request);
  }

  subscribe(
    path: string,
    input: unknown,
    observer: {
      onData?: (data: unknown) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
    }
  ): () => void {
    const request: WRPCRequest = {
      id: this.generateRequestId(),
      type: 'subscription',
      path,
      input,
    };

    const unsubscribe = () => {
      this.activeSubscriptions.delete(request.id);
      // Note: In a full implementation, you might want to send an unsubscribe message
    };

    this.activeSubscriptions.set(request.id, { observer, unsubscribe });
    this.sendRequest(request);

    return unsubscribe;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }
}

// Create a proxy to provide the type-safe interface
export function createWRPCClient<TRouter extends RouterDefinition>(
  options: CreateClientOptions
): InferClient<TRouter> {
  const client = new WRPCClient<TRouter>(options);

  return new Proxy({} as InferClient<TRouter>, {
    get(target, prop: string) {
      return new Proxy({}, {
        get(target, method: string) {
          if (method === 'query') {
            return (input: unknown) => client.query(prop, input);
          } else if (method === 'mutation') {
            return (input: unknown) => client.mutation(prop, input);
          } else if (method === 'subscribe') {
            return (input: unknown, observer: unknown) => client.subscribe(prop, input, observer as Parameters<typeof client.subscribe>[2]);
          }
          throw new Error(`Unknown method: ${method}`);
        }
      });
    }
  });
} 
import { toDataURL, type QRCodeToDataURLOptions } from 'qrcode';

export function generateQrCodeDataUrl(text: string, options?: QRCodeToDataURLOptions): Promise<string> {
	return toDataURL(text, options);
}

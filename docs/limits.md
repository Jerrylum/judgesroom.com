# Limits (v2.1.0)

Operational caps for Judge Advisors and Event Partners. They apply to the hosted app and to a default self-host.

## Access and devices

| Limit                                                              | Value             | Notes                                                                                       |
| ------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------- |
| Live connections per **judge** access link (access control **on**) | **100**           | Extra browser tabs and devices on the same judge link count. A 101st connection is refused. |
| Live connections for the **Judge Advisor** link                    | No cap            | Only judge links are capped.                                                                |
| Live connections when access control is **off**                    | No per-person cap | Anyone with the room link can join.                                                         |
| Device name on the connection                                      | **20** characters | Longer names are rejected when the device connects.                                         |

Rotating a judge’s access link does not raise the cap. It invalidates the old link; new connections use the new link and start a new count.

## Photos

| Limit                          | Value           | Notes                                                               |
| ------------------------------ | --------------- | ------------------------------------------------------------------- |
| Photos per team                | **10**          | Includes photos that are still uploading.                           |
| Photos per Judges' Room        | **500**         | Across all teams.                                                   |
| File size after compression    | **3 MB**        | Larger files are rejected.                                          |
| Longest edge after compression | **1600** pixels | The browser shrinks the image before upload.                        |
| Allowed types                  | JPEG, WebP, PNG | SVG and other types are rejected.                                   |
| Upload token lifetime          | **10 minutes**  | Start the upload again if it expires.                               |
| Cached photo URL               | **24 hours**    | Browsers and the edge may keep a copy after delete for up to a day. |

Self-hosts should also set an R2 object lifecycle (hosted recommendation: **7 days**) so leftover objects do not sit in the bucket forever. Destroying the room deletes that room’s photos from R2.

## Room lifetime

| Limit                                 | Value       | Notes                                                                                                       |
| ------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| Unused / empty room (never set up)    | **1 hour**  | Probes and abandoned creates are removed.                                                                   |
| Idle room after last Event Setup save | **90 days** | Maximum retention: a set-up room is deleted automatically if Event Setup is not saved again within 90 days. |

Destroy the room at the end of the event. Do not rely on the 90-day idle timer for confidentiality.

## Names and text

| Field                                                     | Limit                       |
| --------------------------------------------------------- | --------------------------- |
| Event name                                                | 200 characters              |
| Judge name, judge group name, award name, team group name | 100 characters              |
| Team number                                               | 10 characters (A–Z and 0–9) |
| VEX Events SKU                                            | 12–20 characters            |
| Award winners count                                       | 1–10,000                    |
| Judge groups                                              | At least 1                  |
| Rubric notes and notebook links                           | Not capped                  |

## Networking

| Limit                      | Value    | Notes                                           |
| -------------------------- | -------- | ----------------------------------------------- |
| Incoming WebSocket message | **1 MB** | Oversized frames are dropped before JSON parse. |

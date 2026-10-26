# CS3720 Mini Project 1 — Report Outline

Complete the placeholders with your actual course details, screenshots, test evidence, and reflections. Export the finished document as a PDF for Canvas. Do not present placeholder screenshots, test outcomes, deployment logs, or two-device results as real evidence.

## Cover information

- **Project:** Chat About a Photo
- **Student 1 name and email:** `[Name] — [Email]`
- **Student 2 name and email:** `[Name] — [Email]`
- **Course / section:** `CS3720 — [Section]`
- **Professor:** `[Professor name]`
- **Date:** `[Submission date]`

## 1. Application architecture

Describe the Expo/React Native client, FastAPI backend, HTTP upload and gallery endpoints, WebSocket chat/photo synchronization, and Render deployment setup. Include the project structure and explain how clients share messages and the current photo.

**Architecture diagram or screenshot:** `[Insert diagram or captioned screenshot here]`

## 2. Photo capture and upload

Explain the camera permission flow, capture preview, multipart upload, backend validation, generated filename, and how the returned image is displayed.

**Screenshot 1 — Camera or captured-photo preview:** `[Insert actual screenshot]`  
**Caption:** `[Describe the image and capture state.]`

**Screenshot 2 — Successful upload and photo display:** `[Insert actual screenshot]`  
**Caption:** `[Describe the upload confirmation and displayed shared image.]`

## 3. Real-time chat

Describe the WebSocket connection, message format, connection status, and message exchange. Include at least two actual messages and identify which clients sent/received them.

**Screenshot 3 — Chat with at least two messages:** `[Insert actual screenshot]`  
**Caption:** `[Identify the two messages and the client views.]`

## 4. Two-device WebSocket synchronization

Describe the two devices/emulators, network and backend used, photo synchronization, gallery selection synchronization, and any reconnect/cold-start behavior observed.

**Screenshot 4 — Both clients showing the synchronized photo:** `[Insert actual evidence]`  
**Caption:** `[Explain what is visible on each client.]`

**Screenshot 5 — Message visible on both clients:** `[Insert actual evidence]`  
**Caption:** `[Identify the sender and receiving client.]`

## 5. Optional photo gallery

Describe the gallery behavior, ordering, and what happens when an older thumbnail is selected. If the gallery was not included in your demonstration, state that clearly.

**Screenshot 6 — Gallery and selected older image:** `[Insert actual screenshot or mark not demonstrated]`  
**Caption:** `[Describe the gallery selection.]`

## 6. Generative AI evidence and reflection

Attach the course-required AI-use evidence, such as relevant prompts, generated suggestions, and how you reviewed them. Identify which portions of the implementation used AI assistance and what you personally checked or adapted.

**AI evidence:** `[Insert or attach the evidence required by the course.]`

**Reflection draft — edit to describe your actual work (2–3 sentences):**  
I requested AI assistance to help structure the Expo client and FastAPI/WebSocket integration and to identify implementation details to verify. I checked the suggestions against the installed Expo SDK APIs, ran the available backend and frontend checks, and reviewed the resulting code and behavior rather than treating generated output as proof. AI-assisted ideas were used in the camera/upload flow, backend validation, chat synchronization, and project documentation, which I reviewed and adapted for this assignment.

## 7. Testing results

Record only tests you actually ran. Separate automated backend checks from physical-device/emulator checks, and include failures or limitations.

| Test | Environment | Actual result / evidence |
|---|---|---|
| Backend health and docs | `[Local / Render]` | `[Complete after running]` |
| Valid image upload and retrieval | `[Local / Render]` | `[Complete after running]` |
| Invalid upload rejection | `[Local / Render]` | `[Complete after running]` |
| Chat broadcast between clients | `[Devices / emulators]` | `[Complete after testing]` |
| Photo selection synchronization | `[Devices / emulators]` | `[Complete after testing]` |
| Gallery selection synchronization | `[Devices / emulators]` | `[Complete after testing]` |

## 8. Conclusion

Summarize what the application demonstrates, what you learned, remaining limitations, and any improvements you would make.

## Approximately one-minute demo script

- **0:00–0:08** — Show the application open on two devices and point out the connection status.
- **0:08–0:25** — Capture a photo on the first device, preview it, upload it, and show the selected image update on both devices.
- **0:25–0:42** — Send a chat message from one device and show it appear on the other; send a reply from the second device.
- **0:42–0:52** — Select an older photo from the gallery and show the second device synchronize to it.
- **0:52–1:00** — Briefly summarize the Expo client, FastAPI backend, and WebSocket synchronization.

Record the actual application running; do not fabricate device footage or claim unperformed tests. If a Render service is used, allow for a cold start before recording.

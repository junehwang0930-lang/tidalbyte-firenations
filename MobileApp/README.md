# Fire Nations iPhone app

The MAUI shell bundles the shared React frontend into the app at build time.
The bundled demo runs offline with the fictional floor plan and two sample route
snapshots. The camera overlay uses a simulated heading.

On Linux, use the web demo from the repository README.

On a Mac with Xcode 27.2, its iOS simulator runtime, the .NET 10 SDK pinned by
`global.json`, the matching MAUI workload, and Node.js 22.12 or newer, run these
commands from the repository root:

```sh
npm ci --prefix frontend
cd MobileApp
dotnet build -t:Run -f net10.0-ios -p:RuntimeIdentifier=iossimulator-arm64
```

For VS Code debugging, open the repository, select the MAUI project and iOS
simulator in Microsoft's .NET MAUI extension, and press F5 after `npm ci`.
Camera input requires a supported device and permission. The demo overlay can
be opened and expanded on the simulator with the camera off.

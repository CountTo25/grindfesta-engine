# Grindfesta Engine

Grindfesta Engine is a local editor and compiler for Grindfesta projects. The engine starts a local server and opens the editor in the default browser.

## Windows and macOS releases

Each published GitHub release includes:

- `grindfesta-engine-windows-x64.zip`
- `grindfesta-engine-macos-arm64.zip` for Apple Silicon Macs
- `grindfesta-engine-macos-x64.zip` for Intel Macs

Download the archive for your system, extract the complete folder, and run `grindfesta-engine.exe` on Windows or `grindfesta-engine` on macOS. Keep the `frontend` and `runtime` folders beside the executable; they contain the editor and its bundled build runtime.

The editor is available at `http://localhost:9002` while the executable is running. Project files and the local database are stored beside the executable. Set `GRINDFESTA_NO_OPEN=1` before launching if the browser should not open automatically.

Release binaries are currently unsigned. Windows SmartScreen or macOS Gatekeeper may therefore ask for confirmation. On macOS, use Control-click, select **Open**, and confirm the first launch if normal double-clicking is blocked.

## Linux support

Linux users are expected to build Grindfesta Engine from source. Linux distributions differ in system libraries, packaging conventions, and supported versions, so the project does not claim that one prebuilt binary will work across every popular distribution.

Install a current Rust toolchain and [Bun](https://bun.com/docs/installation), then build on the Linux system where the engine will run:

```sh
cd frontend
bun install --frozen-lockfile
bun run check
bun run build

cd ../backend
cargo test --locked --workspace
cargo build --locked --release -p main
mkdir -p target/release/frontend
cp -R ../frontend/dist/. target/release/frontend/
./target/release/grindfesta-engine
```

This is best-effort source support: distro-specific dependency or toolchain adjustments may still be necessary.

## Development

Install Rust and Bun, then start the API and Vite development server from the repository root:

```sh
bun run.ts
```

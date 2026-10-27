# Releasing Bytescript

GitHub Releases are built automatically by
`.github/workflows/release.yml`.

## Checklist

1. Update the version in `src/bytescript.h`:
   - `BYTESCRIPT_VERSION_MAJOR`
   - `BYTESCRIPT_VERSION_MINOR`
   - `BYTESCRIPT_VERSION_PATCH`
   - `BYTESCRIPT_VERSION`
2. Add a matching `## X.Y.Z` section to `CHANGELOG.md`. The release
   workflow copies that section into the GitHub Release notes.
3. Update user-visible version references in the website/README when
   appropriate.
4. Run the full local suite:

   ```sh
   make clean
   make test
   ./dist/bytescript --version
   ```

5. Commit the release changes and merge them to `main`.
6. Create and push an annotated version tag from the merged commit:

   ```sh
   git checkout main
   git pull
   git tag -a v1.1.0 -m "Bytescript v1.1.0"
   git push origin v1.1.0
   ```

7. Watch the **Release** workflow. It:
   - builds with portable `make release` flags on Windows, Linux and macOS;
   - runs all tests on every operating system;
   - packages the interpreter, shared library, headers, `stdlib/`, exemples,
     license and changelog;
   - extracts and smoke-tests every archive on its native OS;
   - generates `SHA256SUMS.txt`;
   - creates or updates the GitHub Release.
8. Open the finished release and verify that it has three OS archives plus
   `SHA256SUMS.txt`.

## Package names

- `bytescript-vX.Y.Z-windows-x86_64.zip`
- `bytescript-vX.Y.Z-linux-x86_64.tar.gz`
- `bytescript-vX.Y.Z-macos-<arch>.tar.gz`

The packaging helper can also be run locally after building:

```sh
python3 scripts/package_release.py \
  --version v1.1.0 \
  --commit "$(git rev-parse HEAD)" \
  --smoke-test
```

Do not upload a raw `dist/` folder manually: it is easy to miss runtime
libraries or ship a stale/non-portable `-march=native` build.

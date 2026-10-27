# Changelog

## 1.1.0

### Highlights

- **Bytescript now builds and runs on Linux and macOS**, not just Windows.
  A new portability layer (`src/platform.h`) replaces direct Win32 calls
  (`LoadLibrary`, `GetProcAddress`, `GetModuleFileName`, `Sleep`,
  `QueryPerformanceCounter`, `__declspec(dllexport)`) with cross-platform
  helpers. Existing `.bs` programs that do `import "Time.dll"` keep working
  everywhere: the module finder retries with the host extension
  (`.so` / `.dylib`).
- **New website** in `website/` — home page, documentation, install guide,
  downloads and contributors (ready for GitHub Pages).
- **Better CLI**: `bytescript --help`, `--version`, `-e "code"` snippets,
  and an interactive REPL when run without arguments. Unknown flags now
  print usage and exit with code 2 instead of failing silently.
- **Recoverable errors for embedders**: `bs_set_error_jmp()` lets a host
  program `longjmp` out of a Bytescript error instead of having the process
  exit (this is what keeps the REPL alive after an error).
- **Test suite** (`tests/`, 24 checks, `make test`) and GitHub Actions CI
  building on Windows, Ubuntu and macOS.
- VS Code syntax highlighting for `.bs` files (`editors/vscode/`).
- New runnable exemples: `hello.bs`, `fizzbuzz.bs`, `demo.bs`.
- **Prebuilt GitHub Release packages** for Windows, Linux and macOS, with
  bundled exemples and a `SHA256SUMS.txt` checksum file.

### Bug fixes

Several of these crashed or silently miscomputed in 1.0 (found with
AddressSanitizer while porting):

- `a != b` emitted **no opcode at all**, so its operand bytes were executed
  as instructions (crash/corruption for any non-constant `!=`).
- `a < b` between two variables computed `a > b` (`OP_GT_RR` typo).
- `-x` on a variable returned `0`: the unary-minus code fell through into
  the `not` case and overwrote the result; `not x` returned register 0
  (shadowed variable).
- `not x` / `!x` made the parser recurse forever (the `not` token was
  never consumed) — stack overflow.
- Method calls on literals (`"abc":len()`, `"hi " .. name`) passed a
  constant-pool index where a register was expected, so `self` was garbage.
- `File:read()` closed the file handle and `File:close()` closed it again
  (double `fclose`); `close_file` also read a non-existent second argument,
  and `read_file` never set the string length.
- `String:format("%s", …)` wrote its NUL terminator one byte past the
  allocation (heap buffer overflow).
- The Makefiles' object rules had no source prerequisites, so editing a
  `.c` file silently produced a stale binary; `main()` also leaked into
  the shared library. Objects now have real dependencies (`-MMD -MP`).
- `print()` used `%f`, printing `6.000000`; it now uses `%.15g` like
  `String:toString()` (prints `6`).

### Known limitations

- A function cannot call another user-defined function *by name* (including
  recursion): only built-ins/globals, parameters, methods and module
  functions are callable. Pass functions as arguments if you need
  higher-order code (see `tests/07_functions.bs`).
- `else` / `elseif` branches are unreliable — prefer separate `if`
  statements with explicit conditions.

## 1.0

- Initial release: object-oriented, embeddable bytecode interpreter
  (NaN-boxed values, register VM), standard library in C
  (Math, OS, Time, Random, Json, Base64, Debug), Windows only.

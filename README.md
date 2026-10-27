# Bytescript 1.1

Bytescript is an object-oriented, interpreted, embeddable programming
language written in C. It compiles your code to bytecode for its own
register VM (with NaN-boxed values), has optional type annotations,
classes, tables (array + hash map in one), first-class functions and a
small standard library written in C.

```bytescript
class Counter
    func static Counter __new()
        Number self.value = 0
        return self
    end

    func increment()
        self.value = self.value + 1
    end

    func Number get()
        return self.value
    end
end

Counter clicks = Counter:new()
clicks:increment()
print(clicks:get())   -- 1
```

## Website

The `website/` folder contains the project homepage with full
documentation, an install guide, downloads and the contributor list.
Open `website/index.html` in a browser, or serve it with
`python3 -m http.server -d website`. It is ready to deploy on
GitHub Pages (`.github/workflows/pages.yml`).

## Installation

### Download a release

1. Download the latest build from the
   [GitHub releases](https://github.com/gefrus112/Bytescript/releases)
   (or the *Actions → Build & test* artifacts).
2. Unzip it somewhere permanent, e.g. `C:\Program Files\Bytescript`
   (Windows) or `~/.local/bytescript` (Linux/macOS).
3. Add that folder to your `PATH`.
4. Check it works: `bytescript --version`

### Build from source

You need a C compiler (`gcc`) and `make` — MinGW/MSYS2 on Windows,
your distro's `build-essential` on Linux, Xcode Command Line Tools on macOS.

```sh
git clone https://github.com/gefrus112/Bytescript.git
cd Bytescript
make            # builds dist/bytescript(.exe) + library + stdlib modules
make test       # runs the test suite (tests/)
```

Then put the `dist/` folder on your `PATH` (keep the whole folder together:
the interpreter loads `dist/stdlib/` relative to the executable).

## Usage

```sh
bytescript                  # interactive REPL (.help / .exit)
bytescript mycode.bs        # run a program
bytescript -e "print(2+3)"  # run a snippet
bytescript --help           # all options
```

Try the runnable exemples: `bytescript exemples/hello.bs`,
`exemples/fizzbuzz.bs`, `exemples/demo.bs`.

## Documentation

- [Syntax](docs/syntax.md) — statements, expressions, types, operators
- [Standard library](docs/stdlib.md) — built-ins plus Math, OS, Time,
  Random, Json, Base64, Debug
- [Embedding](docs/embedding.md) — using Bytescript from C, writing C modules
- [BVM](docs/bvm.md) — how values and bytecode work inside
- [Website version](website/docs.html) — the same docs in your browser
- [Changelog](CHANGELOG.md) — what changed in 1.1, including fixed crashes
  and the current known limitations

## Editor support

`editors/vscode/` contains a VS Code extension with syntax highlighting
for `.bs` files — see its README for install steps.

## Contributing

Contributions are welcome! Build with `make`, run `make test`, and open a
pull request. New language behaviour should come with a test in `tests/`
(a `.bs` file plus its `.expected` output).

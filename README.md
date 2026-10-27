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
`python3 -m http.server -d website`.

**Publishing on GitHub Pages:** go to the repository's
*Settings → Pages → Build and deployment* and set **Source: GitHub Actions**
— the workflow in `.github/workflows/pages.yml` then deploys `website/`
on every push to `main`. (If the source is left on "Deploy from a branch",
GitHub serves the repository root instead; the root `index.html` is a
fallback that redirects visitors into `website/`, so the address
<https://gefrus112.github.io/Bytescript/> still reaches the site —
but "GitHub Actions" is the recommended setting.)

## Installation

### Download a release

**Latest release: [Bytescript v1.1.0](https://github.com/gefrus112/Bytescript/releases/tag/v1.1.0)**

- [Windows x86_64 (.zip)](https://github.com/gefrus112/Bytescript/releases/download/v1.1.0/bytescript-v1.1.0-windows-x86_64.zip)
- [Linux x86_64 (.tar.gz)](https://github.com/gefrus112/Bytescript/releases/download/v1.1.0/bytescript-v1.1.0-linux-x86_64.tar.gz)
- [macOS Apple Silicon (.tar.gz)](https://github.com/gefrus112/Bytescript/releases/download/v1.1.0/bytescript-v1.1.0-macos-arm64.tar.gz)
- [SHA-256 checksums](https://github.com/gefrus112/Bytescript/releases/download/v1.1.0/SHA256SUMS.txt)
- [All releases](https://github.com/gefrus112/Bytescript/releases)

1. Download the package for your operating system.
2. Extract it somewhere permanent, e.g. `C:\Program Files\Bytescript`
   (Windows) or `~/.local/bytescript` (Linux/macOS). Keep the executable,
   shared library and `stdlib/` folder together.
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
(a `.bs` file plus its `.expected` output). Maintainers can follow
[RELEASING.md](RELEASING.md) to publish tagged GitHub Releases.

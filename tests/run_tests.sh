#!/usr/bin/env bash
# Bytescript test suite.
#
# Usage:  ./tests/run_tests.sh        (from the repository root, after `make`)
#         make test                   (builds, then runs this script)
#
# Each tests/NN_name.bs is run and its stdout is compared with
# tests/NN_name.expected (trailing whitespace - Bytescript's print() adds a
# tab after each value - is ignored). A few CLI behaviours (--version, -e,
# the REPL, unknown flags) and the runnable exemples are checked too.

set -u
cd "$(dirname "$0")/.."

if [ -x dist/bytescript.exe ]; then BIN=dist/bytescript.exe
elif [ -x dist/bytescript ]; then BIN=dist/bytescript
else echo "error: dist/bytescript not found - run 'make' first" >&2; exit 1; fi

pass=0; fail=0
ok()   { pass=$((pass+1)); printf '  PASS %s\n' "$1"; }
bad()  { fail=$((fail+1)); printf '  FAIL %s\n' "$1"; }
norm() { sed 's/[[:space:]]*$//'; }

# Portable "timeout 15": GNU timeout is missing on stock macOS (it is
# `gtimeout` from coreutils there), so fall back to perl's alarm, then to
# running the command directly.
run_t() {
    if command -v timeout >/dev/null 2>&1; then timeout 15 "$@"
    elif command -v gtimeout >/dev/null 2>&1; then gtimeout 15 "$@"
    elif command -v perl >/dev/null 2>&1; then perl -e 'my $s = shift; alarm $s; exec @ARGV' 15 "$@"
    else "$@"
    fi
}

echo "== language tests =="
for bs in tests/[0-9]*.bs; do
    name=$(basename "$bs" .bs)
    expected="tests/$name.expected"
    raw=$(run_t "./$BIN" "$bs" 2>&1); code=$?
    out=$(printf '%s' "$raw" | norm)
    want=$(norm < "$expected")
    if [ $code -eq 0 ] && [ "$out" = "$want" ]; then ok "$name"
    else
        bad "$name (exit $code)"
        # (no `diff` dependency: it is not always installed, e.g. MSYS2)
        printf '%s\n' "$want" | head -20 | sed 's/^/      expected: /'
        printf '%s\n' "$out"  | head -20 | sed 's/^/      actual:   /'
    fi
done

echo "== CLI tests =="
v=$("./$BIN" --version); case "$v" in Bytescript*) ok "--version ($v)";; *) bad "--version ($v)";; esac

out=$("./$BIN" -e 'print(6 * 7)' | norm)
[ "$out" = "42" ] && ok "-e snippet" || bad "-e snippet (got: $out)"

out=$(printf 'print(1)\nprint(undefined_var)\nprint("still alive")\n.exit\n' | "./$BIN" 2>&1 | norm)
case "$out" in *"still alive"*) ok "REPL recovers from errors";; *) bad "REPL recovers from errors";; esac

"./$BIN" --definitely-not-a-flag >/dev/null 2>&1; code=$?
[ $code -eq 2 ] && ok "unknown flag exits 2" || bad "unknown flag exits 2 (got $code)"

echo "== exemples smoke tests =="
for f in exemples/hello.bs exemples/fizzbuzz.bs exemples/demo.bs exemples/stringFind.bs exemples/stringReverse.bs exemples/fib.bs exemples/tableSum.bs exemples/bubbleSort.bs exemples/insertionSort.bs exemples/counterClass.bs; do
    if run_t "./$BIN" "$f" >/dev/null 2>&1; then ok "$f"; else bad "$f"; fi
done

echo
echo "passed: $pass  failed: $fail"
[ $fail -eq 0 ]

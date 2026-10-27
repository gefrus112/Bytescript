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

echo "== language tests =="
for bs in tests/[0-9]*.bs; do
    name=$(basename "$bs" .bs)
    expected="tests/$name.expected"
    out=$(timeout 15 "./$BIN" "$bs" 2>&1 | norm); code=$?
    want=$(norm < "$expected")
    if [ $code -eq 0 ] && [ "$out" = "$want" ]; then ok "$name"
    else
        bad "$name (exit $code)"
        diff <(printf '%s\n' "$want") <(printf '%s\n' "$out") | head -20 | sed 's/^/      /'
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
    if timeout 15 "./$BIN" "$f" >/dev/null 2>&1; then ok "$f"; else bad "$f"; fi
done

echo
echo "passed: $pass  failed: $fail"
[ $fail -eq 0 ]

all:
	$(MAKE) -C src all
	$(MAKE) -C stdlib_src all
	cp icon.ico dist/icon.ico

test: all
	./tests/run_tests.sh

%:
	$(MAKE) -C src $@
	$(MAKE) -C stdlib_src $@
	cp icon.ico dist/icon.ico

clean:
	rm -rf build
	rm -rf dist

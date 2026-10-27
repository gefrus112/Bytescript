CC = gcc
CFLAGS = -I./ -I../ -I../src -I../dist

# ---------------------------------------------------------------------------
# Platform detection (mirrors src/Makefile): standard library modules are
# <Module>.dll on Windows, <Module>.so on Linux, <Module>.dylib on macOS,
# always flat inside dist/stdlib/ next to their *_map.bs files.
# ---------------------------------------------------------------------------
ifeq ($(OS),Windows_NT)
	PLATFORM := windows
	SHARED_EXT := .dll
	C_API := ../dist/bytescript.lib
	LDLIBS :=
else
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Darwin)
		PLATFORM := macos
		SHARED_EXT := .dylib
		C_API := ../dist/libbytescript.dylib
	else
		PLATFORM := linux
		SHARED_EXT := .so
		C_API := ../dist/libbytescript.so
	endif
	CFLAGS += -fPIC
	LDLIBS := -lm
endif

SRC := $(wildcard */*.c)
MODULES := $(patsubst %.c, %, $(notdir $(SRC)))
TARGET := $(MODULES:%=../dist/stdlib/%$(SHARED_EXT))
MAPS := $(patsubst %.bs, ../dist/stdlib/%.bs, $(notdir $(wildcard */*_map.bs)))

main : $(TARGET) $(MAPS)

all: CFLAGS += -O3 -march=native
all: main

o_o : CFLAGS += -O0 -march=native
o_o : main

o_one : CFLAGS += -O1 -march=native
o_one : main

o_two : CFLAGS += -O2 -march=native
o_two : main

o_three : CFLAGS += -O3 -march=native
o_three : main

byte : CFLAGS += -O2 -march=native
byte : main

debug : CFLAGS += -O0 -g
debug : main

release : CFLAGS += -O3
release : main

ifeq ($(PLATFORM),windows)
../dist/stdlib/%$(SHARED_EXT): ../build/%.o $(C_API) | ../dist/stdlib
	$(CC) $(CFLAGS) -shared $< $(C_API) -o $@ $(LDLIBS)
else
../dist/stdlib/%$(SHARED_EXT): ../build/%.o $(C_API) | ../dist/stdlib
	$(CC) $(CFLAGS) -shared $< -L../dist -lbytescript -o $@ $(LDLIBS)
endif

../dist/stdlib/%_map.bs: | ../dist/stdlib
	cp $(shell find . -name $*_map.bs) $@

# One explicit rule per source file (see src/Makefile).
define OBJ_RULE
../build/$(notdir $(1:.c=.o)): $(1) | ../build
	$(CC) $(CFLAGS) -MMD -MP -c $(1) -o ../build/$(notdir $(1:.c=.o))
endef
$(foreach f, $(SRC), $(eval $(call OBJ_RULE, $(f))))

-include $(MODULES:%=../build/%.d)

../build:
	mkdir -p ../build

../dist/stdlib:
	mkdir -p ../dist/stdlib

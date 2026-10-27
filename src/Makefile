CC = gcc
CFLAGS = -I./ -I../ -I./Values

# ---------------------------------------------------------------------------
# Platform detection: Windows keeps the historical layout
# (bytescript.exe + bytescript.dll + bytescript.lib), Linux and macOS get
# the Unix equivalent (bytescript + libbytescript.so / libbytescript.dylib).
# ---------------------------------------------------------------------------
ifeq ($(OS),Windows_NT)
	PLATFORM := windows
	EXE_EXT := .exe
	SHARED_LIB := ../dist/bytescript.dll
	IMPORT_LIB := ../dist/bytescript.lib
	LINK_LIB := $(IMPORT_LIB)
	LDLIBS :=
	RPATH :=
else
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Darwin)
		PLATFORM := macos
		SHARED_LIB := ../dist/libbytescript.dylib
		RPATH := -Wl,-rpath,@executable_path
	else
		PLATFORM := linux
		SHARED_LIB := ../dist/libbytescript.so
		RPATH := -Wl,-rpath,'$$ORIGIN'
	endif
	EXE_EXT :=
	IMPORT_LIB :=
	LINK_LIB := $(SHARED_LIB)
	CFLAGS += -fPIC
	LDLIBS := -lm -ldl
endif

SRC := $(wildcard *.c */*.c */*/*.c)
MAIN_SRC := $(wildcard *.c)
LIB_SRC := $(filter-out $(MAIN_SRC), $(SRC))
MAPS_SRC := $(wildcard Globals/maps/*.bs)

MAIN_OBJ := $(patsubst %.c, ../build/%.o, $(notdir $(MAIN_SRC)))
LIB_OBJ  := $(patsubst %.c, ../build/%.o, $(notdir $(LIB_SRC)))

OBJ    := $(MAIN_OBJ) $(LIB_OBJ)
MAPS   := $(MAPS_SRC:Globals/maps/%.bs=../dist/stdlib/%.bs)
TARGET := $(patsubst %.c, ../dist/%$(EXE_EXT), $(MAIN_SRC))
C_API  := ../dist/bytescript.h ../dist/platform.h ../dist/bytev.h ../dist/Values/bytev.h

main : $(TARGET) $(MAPS) $(C_API)

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

release : CFLAGS += -O3
release : main

debug : CFLAGS += -O0 -g
debug : main

ifeq ($(PLATFORM),windows)
../dist/%$(EXE_EXT): ../build/%.o $(LINK_LIB) | ../dist
	$(CC) $(CFLAGS) $^ -o $@ $(LDLIBS)
else
# Link with -lbytescript (not the ../dist/... path) so the executable records
# the library's SONAME and finds it next to itself via the rpath above.
../dist/%$(EXE_EXT): ../build/%.o $(LINK_LIB) | ../dist
	$(CC) $(CFLAGS) $< -o $@ -L../dist -lbytescript $(RPATH) $(LDLIBS)
endif

ifeq ($(PLATFORM),windows)
../dist/bytescript.lib: ../dist/bytescript.dll | ../dist
	dlltool -d bytescript.def -l $@

../dist/bytescript.dll: $(LIB_OBJ) | ../dist
	$(CC) $(CFLAGS) $^ -shared bytescript.def -o $@ $(LDLIBS)
else
ifeq ($(PLATFORM),macos)
$(SHARED_LIB): $(LIB_OBJ) | ../dist
	$(CC) $(CFLAGS) $^ -shared -Wl,-install_name,@rpath/libbytescript.dylib -o $@ $(LDLIBS)
else
$(SHARED_LIB): $(LIB_OBJ) | ../dist
	$(CC) $(CFLAGS) $^ -shared -Wl,-soname,libbytescript.so -o $@ $(LDLIBS)
endif
endif

# One explicit rule per source file: objects must rebuild when their source
# changes (the old pattern rule had no source prerequisite, so editing a .c
# file silently produced a stale binary). -MMD/-MP track header deps.
define OBJ_RULE
../build/$(notdir $(1:.c=.o)): $(1) | ../build
	$(CC) $(CFLAGS) -MMD -MP -c $(1) -o ../build/$(notdir $(1:.c=.o))
endef
$(foreach f, $(SRC), $(eval $(call OBJ_RULE, $(f))))

-include $(OBJ:.o=.d)

../dist/bytescript.h: bytescript.h | ../dist
	cp $< $@

../dist/platform.h: platform.h | ../dist
	cp $< $@

# bytescript.h does #include "bytev.h", so the public header is shipped flat
# in dist/ (historical layout embedders rely on) as well as in dist/Values/.
../dist/bytev.h: Values/bytev.h | ../dist
	cp $< $@

../dist/Values/bytev.h: Values/bytev.h | ../dist
	mkdir -p ../dist/Values
	cp $< $@

../dist/stdlib/%.bs: Globals/maps/%.bs | ../dist/stdlib
	cp $< $@

../build :
	mkdir -p ../build

../dist :
	mkdir -p ../dist

../dist/stdlib:
	mkdir -p ../dist/stdlib

dis : CFLAGS += -O2
dis : clean all
	objdump -d ../build/dised.o > ../dist/dised.txt

CC = gcc
CFLAGS = -Wall -O2 -I include
LDFLAGS = -lws2_32 -lshlwapi -ladvapi32 -lcrypt32

SRCDIR = src
BINDIR = bin

SOURCES = $(SRCDIR)/main.c $(SRCDIR)/server.c $(SRCDIR)/handlers.c $(SRCDIR)/client.c \
          $(SRCDIR)/network.c $(SRCDIR)/database.c $(SRCDIR)/crypto.c $(SRCDIR)/sqlite3.c
TARGET = $(BINDIR)/sectrans.exe

all: $(TARGET)

$(TARGET): $(SOURCES)
	@if not exist $(BINDIR) mkdir $(BINDIR)
	$(CC) $(CFLAGS) -o $@ $(SOURCES) $(LDFLAGS)

clean:
	@if exist $(BINDIR)\sectrans.exe del /Q $(BINDIR)\sectrans.exe
	@if exist sectrans.db del /Q sectrans.db

.PHONY: all clean

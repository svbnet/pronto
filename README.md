# Pronto
This is my collection of code and documentation for the Philips Pronto series of remotes.
I came into a collection of a couple of late-model Pronto remotes as well as an IR extender, and thought
I would document my efforts at making it work with my modern AV setup as well as Home Assistant.

https://archive.org/search?query=philips+pronto
https://archive.org/search?query=subject%3A%22ProntoEdit%22

The devices I have are the following:
* [TSU9800](https://archive.org/details/manualzilla-id-6266768)
* TSU9300
* RFX9400

Therefore, most of these docs will be centered around the above and ProntoEdit Professional 2.
Please see below for more info on the specifics regarding ProntoEdit Professional 2.

## What is Pronto?
Philips Pronto is the brand name for a discontinued series of smart remote controls, touch panels
and bridges that were sold from the late 90s to the late 2010s. In particular, the remote controls
have an LCD screen and varying number of buttons which makes them very configurable. Installers could
design a bespoke UI, as well as set up the integrations for each remote and then write it to the remote
over USB. Additionally, physical bridges ("extenders") can also be added in order to support RS232,
IR and relay control for hardware like TVs and receivers.

A compelling feature of the hardware is support for WiFi and Ethernet, making it possible to use TCP/IP and UDP
sockets from the remotes directly, which is what I aim to uncover in this repo.

## Using ProntoEdit Professional 2 on a modern system
ProntoEdit Professional 2 seems to work OK on a Windows 10 x64 system. The installer will hang but this seems to be
during the extracting of samples to `C:\ProgramData`. Using 7zip will enable you to extract these files from `$APPDATA`.

### Help
The included HTML help docs don't work on modern browsers. A converted PDF version is available
[here](docs/ProntoEditProfessional2.pdf).

## ProntoScript
ProntoScript is the Philips-branded JavaScript framework/runtime that runs on the TSU9400 and above. ProntoScript provides
a number of APIs and methods to control the remote interface.

A full guide to the ProntoScript API can be found [here](docs/developer-guide-1.3.9.pdf).

### Errata that the docs don't mention
The ProntoScript JS runtime appears to be an ancient version of SpiderMonkey (the JS engine that Firefox uses) that
implements ES3 (and E4X, as was the style at the time).

The global context/scope isn't well defined - there's no directly accessible `global` or `window` object. What you see in
the docs is what you get. I assume this was done to prevent native objects from leaking between contexts.

* Activities (and anything outside of the current activity) do not share a scope. Navigating to a new activity is like
  navigating to a new HTML page. If you have a hard key handler at the global level it will also execute in an entirely new scope.
* `System.include` essentially `eval`s the script in the current global context - this means that any top-level variables
  defined become globals, and you will need to include the same module in each activity/button event handler.
* The documentation comment at the top of each JS module is required for it to show up in ProntoEdit.
* Pages share the same scope. Therefore, if you want to pass data between screens, implementing one activity with a bunch of
  pages is the most effective method.
* `System.setGlobal` is the only way to share data outside of activities, though it only works for strings. Given how powerful
  these things are I wouldn't recommend serializing/deserializing huge code or data structures.
* There is no text wrapping. Period. You have to use `Widget.getLabelSize` and/or manually insert line breaks if you don't want
  your text to disappear offscreen.

### TypeScript
In the `prontoscript` directory there is a bunch of type definitions for the ProntoScript API as well as the included HTTP
library. Since the JS environment is quite nonstandard and old, TypeScript will target ES5 and assume a lot more functions are
available than there actually are.

## The Config File
This section mostly deals with the ProntoEdit/simulator side of things. For more information on the format of the config file,
see [here](cfedit/readme.md).

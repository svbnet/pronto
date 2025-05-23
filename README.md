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

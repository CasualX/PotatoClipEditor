# Potato Clip Editor

This is a WebApp, it is live on [casualhacks.net](https://casualhacks.net/PotatoClipEditor/).

## User Story

You play video games and use recording software to create clips out of your gameplay, using, e.g. Nvidia ShadowPlay, Xbox Game Bar or OBS Replay Buffer.

The result is a bunch of video files containing past gameplay named with just their timestamp. Due to how clips work, each video file contains more footage than the actual interesting content.

As a user, I wish to splice and concatenate these clips together in minimal effort.

## FFmpeg

The actual video and audio processing is done offline by FFmpeg. The WebApp does not and cannot do this processing itself. All it does is produce a set of commands that the user will execute locally on their machine invoking the FFmpeg tool to do the processing.

Download the appropriate FFmpeg build for your platform, eg. Windows builds can be found [here](https://github.com/BtbN/FFmpeg-Builds/releases). Download the version `ffmpeg-N-[numbers]-[hashcode]-win64-gpl.zip` and extract it.

Shift + right click the ffmpeg executable in the bin folder and choose 'Copy as path'. You will need to paste this as the 'FFmpeg path' argument when exporting your clips. This only needs to be done once, PotatoClipEditor will remember your configuration.

## Development

Everything is static. The stylesheet is generated with Tailwind CSS.

To generate the Tailwind CSS classes, get the standalone Tailwind CSS CLI (see [here](https://tailwindcss.com/blog/standalone-cli)) and run e.g. `./tailwindcss-windows-x64.exe -i ./input.css -o ./docs/styles.css --minify`.

or with `--watch` to watch for changes.

## License

Licensed under [GPL 3.0 License](https://opensource.org/licenses/GPL-3.0), see [license.txt](license.txt).

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you, shall be licensed as above, without any additional terms or conditions.

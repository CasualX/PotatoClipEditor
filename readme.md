Potato Clip Editor
==================

User Story:

You play video games and use recording software to create clips out of your gameplay, using, e.g. Nvidia ShadowPlay, Xbox Game Bar or OBS Replay Buffer.

The result is a bunch of different video files containing past gameplay. Due to how clips work, each video file contains more footage than the actual interesting content.

As a user, I wish to be able to splice and stitch these videos together with minimal effort.


## Development

Everything is static. For a development server with HMR, you can run `npm dev`.

To enable Tailwind CSS, in `main.js` uncomment the line
```js
import 'tailwindcss/tailwind.css';
```
and in `index.html` comment out the line
```html
<link rel="stylesheet" type="text/css" href="./styles.css" />
```

To generate Tailwind classes for production, run `npm run build` and copy the generated `.css` file from the `dist/assets/` folder into `styles.css`.

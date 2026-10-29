# Justine Jomoc portfolio

Static HTML, vanilla JavaScript, and compiled Tailwind CSS. Open `index.html` or serve this folder with a static web server. No server-side runtime is required for hosting.

The layout follows the supplied derolez.dev reference: a contextual text rail and a horizontal gallery of tall visuals. Use the hamburger menu, select a visual, swipe/scroll the gallery, or use the arrow controls to navigate. Keyboard users can use the gallery's Left/Right, Home, and End keys. On phones, the gallery appears above the text. Light and dark modes are available in the rail footer.

## Development

Install Node.js, then run:

```sh
npm ci
npm run build
npm test
```

Use `npm run dev` to rebuild the stylesheet while editing HTML or JavaScript.

The particle background also works when opening `index.html` directly from disk. `particlesjs-config.json` is the editable source; `npm run build` generates `particles-config.js` so direct file pages can load the settings without a blocked JSON request. When served over HTTP, the background reads the JSON and uses the bundled settings if the request fails. Rebuild after changing the JSON to update direct-file viewing.

## Before submission

This is a local design review version. Pending entries are explicitly labeled. Confirm the About draft, existing credentials, individual skills, social links, and OJT availability. Fill the projects, course completions, awards, and leadership sections using actual evidence. Use the built-in Update checklist to track missing content.

The `pictures` folder contains existing user-supplied assets. Decorative project illustrations do not represent completed projects.

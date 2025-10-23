## Bundled Distribution

This folder contains a single bundle of chessboard-element, the default SVG icons, and dependencies lit-html and LitElement. This is to make it as easy as possible to use, while also having more optimal loading, in demos and static pages without a build system.

The bundled file is _not_ recommended for apps and sites that do have a build system and may also be using other web components that use lit-html and LitElement. Most bundlers will not recognize and deduplicate the multiple copies of libraries in that case.

To import the element from HTML, use a script tag:

```html
<script type="module" src="https://unpkg.com/chessboard-element/bundled/chessboard-element.bundled.js"></script>
```

If you're tempted to load the bundled file into JavaScript with an import statement, I strongly encourage you to use the default unbundled library.

# Chisel

Chisel is an open source writing app. I write a lot, and it is customized for me. Read on to see if it's for you!

## Chisel may be for you if...
- You're writing a book and want a free alternative to Scrivener.
- You want better speech-to-text results than what Apple has built in. 
- You like keyboard shortcuts, or want a writing app with a quick launch feature.
- You have wanted to organize your chapters into blocks.
- You want a writing app with end-to-end encryption.
- You'd like to try using AI to help edit your work.
- You want your writing to sync across all your devices.
- You want a writing app that is a web app.

### Chisel is not right for you if...
- You want to visualize connections between all your notes.
- You are looking for a desktop app.
- You want collaborative editing.

### Installation

You will need:

1. An OpenAI key
2. A Firebase account
3. A machine with Node installed.

Then:

1. Add your OpenAI key to `settings.example.js`.
2. Add your Firebase config to `settings.example.js`.
3. Add a salt to `settings.example.js` (`tokenSalt`).
4. Rename `settings.example.js` to `settings.js`.
5. Get your `serviceAccountKey.json` from Firebase and save it in the root directory of your project.
6. `yarn` to install dependencies.

### Running

```
yarn build
yarn start
```

### Developing

You can use watch mode for faster development locally.

```
yarn watch # for webpack
yarn nodemon # for the server
```

### Running tests

```
NODE_OPTIONS=--experimental-vm-modules yarn test
```

### Integration tests

You'll first need to add login details for a real user in settings.js:

```js
testuser: {
  userid: '',
  email: '',
  password: ''
}
```

Now run:

```
yarn cypress
```

And follow the instructions.

### Bundle size

Run `yarn buildstats` and then run through https://chrisbateman.github.io/webpack-visualizer/

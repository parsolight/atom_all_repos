% The Neon Guide

Neon is a Rust bridge to the [Node.js](http://nodejs.org) platform: an
API (and a set of tools) for implementing binary Node modules in
Rust. Neon makes it possible to write **fast**, **portable**, and
**parallel** modules with [Rust](http://www.rust-lang.org): a language
that makes systems programming safe and fun!

# Why Rust?

The reasons to use Rust for implementing Node addons are simple: it's
safe, it's modern, **and it's fun!**

Binary addons written with Neon can be useful for:

* **performance:** While V8 is a high-quality modern JavaScript
engine, it is generally much easier to get higher performance, and
with greater predictability, from Rust than from high-level dynamic
languages like JavaScript.

* **parallelism:** Neon provides access to Rust's [_fearless
concurrency and
parallelism_](http://blog.rust-lang.org/2015/04/10/Fearless-Concurrency.html),
which allows you to take advantage of modern multicore hardware when
operating on certain types of JavaScript data.

* **bindings:** Neon is a great way to connect the NPM and Cargo
ecosystems to make packages built for one available to the other.

# Getting Started

Getting started with Neon is easy. You'll need a recent Node
installation (4.x or later), a recent Rust installation (1.5 or
later), and for OS X developers, you'll also need
[XCode](https://developer.apple.com/xcode/).

Install the Neon command-line tool with:

```shell
$ npm install -g neon-cli
```

That's it—you're ready to create your first Neon project!

# Creating a Project

Let's start by creating a simple project. Installing `neon-cli`
globally should have added a `neon` command to your path, so you
should be able to type:

```shell
$ neon new hello-node
```

and see a new directory `hello-node`, which should look like this:

```text
hello-node/
├── README.md
├── lib/
│   └── index.js
├── native/
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
└── package.json
```

From the outside world, your project is a Node (npm) package, with a
top-level `package.json` pointing to a main module at
`lib/index.js`. Your Rust code lives inside the `native/`
subdirectory.

Take a look at `lib/index.js`:

```javascript
var addon = require('../native');

console.log(addon.hello());
```

You can see that the native module is accessible internally to your
JavaScript code by requiring directly from the `native/`
directory. This works because building your Neon project generates a
Node addon at `native/index.node`. Try it now by running:

```shell
$ npm install
```

from inside the top-level `hello-node` directory. You'll see it runs
Cargo, Rust's package manager and build tool, and generates
`native/index.node` for you. You can test the project by running:

```shell
$ node -e "require('.')"
hello node
```

We'll look at the Rust code in the next section, but for now the only
other thing to note is `native/Cargo.toml`, which is like Rust's
version of `package.json`. When you want to use other Rust _crates_
(the Rusty term for packages) from [crates.io](http://crates.io), you
can add them to the `[dependencies]` section, much like the
`"dependencies"` section of a `package.json` manifest.

# Hello Node!

TODO.

```rust
#[macro_use]
extern crate neon;

use neon::vm::{Call, JsResult};
use neon::js::JsString;

fn hello(call: Call) -> JsResult<JsString> {
    let scope = call.scope;
    Ok(JsString::new(scope, "hello node").unwrap())
}

register_module!(m, {
    m.export("hello", hello)
});
```

TODO.

# Getting Acquainted With Rust

TODO.

# JavaScript Data

TODO.

# Memory Management

TODO.

# Errors

TODO.

# Where Do I Go From Here?

Now that you're up and running, the next thing you'll want to do is
start playing with the Neon API. The [API Documentation](./neon) is a
good place to poke around and see what kinds of things you can do with
JavaScript data in Neon.

If you get stuck, **don't suffer in silence!** Come ask your questions
on our [community Slack](http://rustbridge.slack.com)—just grab an
[automatic invite](http://rustbridge-community-slackin.herokuapp.com/)
and then join us in `#neon`!

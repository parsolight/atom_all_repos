extern crate bindgen;
extern crate cc;
extern crate glob;

use glob::glob;
use std::env;

fn main() {
    let node_include_path = env::var("NODE_INCLUDE_PATH");
    if node_include_path.is_err() {
        eprintln!("NODE_INCLUDE_PATH environment variable is not defined.");
        eprintln!("Make sure you're running cargo via the `napi` wrapper script to assign correct environment variables and options.");
        std::process::exit(1);
    };
    let node_include_path = node_include_path.unwrap();

    println!("cargo:rerun-if-env-changed=NODE_INCLUDE_PATH");
    for entry in glob("./src/sys/**/*.*").unwrap() {
        println!("cargo:rerun-if-changed={}", entry.unwrap().to_str().unwrap());
    }

    bindgen::Builder::default()
        .header("src/sys/bindings.h")
        .clang_arg(String::from("-I") + &node_include_path)
        .rustified_enum("(napi_|uv_).+")
        .whitelist_function("(napi_|uv_|extras_).+")
        .whitelist_type("(napi_|uv_|extras_).+")
        .generate()
        .expect("Unable to generate napi bindings")
        .write_to_file("src/sys/bindings.rs")
        .expect("Unable to write napi bindings");

    cc::Build::new()
        .cpp(true)
        .include(&node_include_path)
        .file("src/sys/bindings.cc")
        .flag("-std=c++0x")
        .flag("-Wno-unused-parameter")
        .compile("extras");
}

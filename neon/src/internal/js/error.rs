use std::mem;
use std::ffi::CString;

use neon_sys;
use neon_sys::raw;

use internal::vm::{Throw, VmResult};
use internal::js::{Value, ValueInternal, Object, ToJsString, build};
use internal::mem::{Handle, Managed};
use scope::Scope;

pub fn throw<'a, T: Value, U>(v: Handle<'a, T>) -> VmResult<U> {
    unsafe {
        neon_sys::error::throw(v.to_raw());
    }
    Err(Throw)
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct JsError(raw::Local);

impl Managed for JsError {
    fn to_raw(self) -> raw::Local { self.0 }

    fn from_raw(h: raw::Local) -> Self { JsError(h) }
}

impl ValueInternal for JsError {
    fn is_typeof<Other: Value>(other: Other) -> bool {
        unsafe { neon_sys::tag::is_error(other.to_raw()) }
    }
}

impl Value for JsError { }

impl Object for JsError { }

pub enum Kind {
    Error,
    TypeError,
    ReferenceError,
    RangeError,
    SyntaxError
}

fn message(msg: &str) -> CString {
    CString::new(msg).ok().unwrap_or_else(|| { CString::new("").ok().unwrap() })
}

impl JsError {
    pub fn new<'a, T: Scope<'a>, U: ToJsString>(scope: &mut T, kind: Kind, msg: U) -> VmResult<Handle<'a, JsError>> {
        let msg = msg.to_js_string(scope);
        build(|out| {
            unsafe {
                let raw = msg.to_raw();
                match kind {
                    Kind::Error          => neon_sys::error::new_error(out, raw),
                    Kind::TypeError      => neon_sys::error::new_type_error(out, raw),
                    Kind::ReferenceError => neon_sys::error::new_reference_error(out, raw),
                    Kind::RangeError     => neon_sys::error::new_range_error(out, raw),
                    Kind::SyntaxError    => neon_sys::error::new_syntax_error(out, raw)
                }
            }
            true
        })
    }

    pub fn throw<T>(kind: Kind, msg: &str) -> VmResult<T> {
        let msg = &message(msg);
        unsafe {
            let ptr = mem::transmute(msg.as_ptr());
            match kind {
                Kind::Error          => neon_sys::error::throw_error_from_cstring(ptr),
                Kind::TypeError      => neon_sys::error::throw_type_error_from_cstring(ptr),
                Kind::ReferenceError => neon_sys::error::throw_reference_error_from_cstring(ptr),
                Kind::RangeError     => neon_sys::error::throw_range_error_from_cstring(ptr),
                Kind::SyntaxError    => neon_sys::error::throw_syntax_error_from_cstring(ptr)
            }
        }
        Err(Throw)
    }
}

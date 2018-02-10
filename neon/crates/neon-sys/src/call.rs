use raw::{FunctionCallbackInfo, Isolate, Local};

extern "C" {

    #[link_name = "NeonSys_Call_SetReturn"]
    pub fn set_return(info: &FunctionCallbackInfo, value: Local);

    #[link_name = "NeonSys_Call_GetIsolate"]
    pub fn get_isolate(info: &FunctionCallbackInfo) -> *mut Isolate;

    #[link_name = "NeonSys_Call_CurrentIsolate"]
    pub fn current_isolate() -> *mut Isolate;

    #[link_name = "NeonSys_Call_IsConstruct"]
    pub fn is_construct(info: &FunctionCallbackInfo) -> bool;

    #[link_name = "NeonSys_Call_This"]
    pub fn this(info: &FunctionCallbackInfo, out: &mut Local);

    #[link_name = "NeonSys_Call_Callee"]
    pub fn callee(info: &FunctionCallbackInfo, out: &mut Local);

    #[link_name = "NeonSys_Call_Data"]
    pub fn data(info: &FunctionCallbackInfo, out: &mut Local);

    #[link_name = "NeonSys_Call_Length"]
    pub fn len(info: &FunctionCallbackInfo) -> i32;

    #[link_name = "NeonSys_Call_Get"]
    pub fn get(info: &FunctionCallbackInfo, i: i32, out: &mut Local);

}

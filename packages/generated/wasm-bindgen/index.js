let wasm;

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => state.dtor(state.a, state.b));

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            state.dtor(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}
/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_checkcodesender(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_checkcodesender(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_checkcodesender(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_checkcodesender(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {number} code
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_checkcodesender_send(ptr, code) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_checkcodesender_send(ptr, code);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_client(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_client(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_client(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_client(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {bigint} authorization_data
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_abort_oidc_auth(ptr, authorization_data) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_abort_oidc_auth(ptr, authorization_data);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_type
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_account_data(ptr, event_type) {
    const ptr0 = passArray8ToWasm0(event_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_account_data(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} action
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_account_url(ptr, action) {
    const ptr0 = passArray8ToWasm0(action, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_account_url(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_available_sliding_sync_versions(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_available_sliding_sync_versions(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_avatar_url(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_avatar_url(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_await_room_remote_echo(ptr, room_id) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_await_room_remote_echo(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_cached_avatar_url(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_cached_avatar_url(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_can_deactivate_account(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_can_deactivate_account(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} sync_service
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_clear_caches(ptr, sync_service) {
    const ptr0 = passArray8ToWasm0(sync_service, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_clear_caches(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} request
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_create_room(ptr, request) {
    const ptr0 = passArray8ToWasm0(request, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_create_room(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} jwt
 * @param {Uint8Array} initial_device_name
 * @param {Uint8Array} device_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_custom_login_with_jwt(ptr, jwt, initial_device_name, device_id) {
    const ptr0 = passArray8ToWasm0(jwt, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(initial_device_name, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(device_id, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_custom_login_with_jwt(ptr, ptr0, len0, ptr1, len1, ptr2, len2);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} auth_data
 * @param {number} erase_data
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_deactivate_account(ptr, auth_data, erase_data) {
    const ptr0 = passArray8ToWasm0(auth_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_deactivate_account(ptr, ptr0, len0, erase_data);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} identifiers
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_delete_pusher(ptr, identifiers) {
    const ptr0 = passArray8ToWasm0(identifiers, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_delete_pusher(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_device_id(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_device_id(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_display_name(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_display_name(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} enable
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_enable_all_send_queues(ptr, enable) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_enable_all_send_queues(ptr, enable);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} enable
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_enable_send_queue_upload_progress(ptr, enable, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_enable_send_queue_upload_progress(ptr, enable, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_encryption(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_encryption(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_fetch_media_preview_config(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_fetch_media_preview_config(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_dm_room(ptr, user_id, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_dm_room(ptr, ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_invite_avatars_display_policy(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_invite_avatars_display_policy(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_max_media_upload_size(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_max_media_upload_size(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} media_source
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_media_content(ptr, media_source) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_media_content(ptr, media_source);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} media_source
 * @param {Uint8Array} filename
 * @param {Uint8Array} mime_type
 * @param {number} use_cache
 * @param {Uint8Array} temp_dir
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_media_file(ptr, media_source, filename, mime_type, use_cache, temp_dir) {
    const ptr0 = passArray8ToWasm0(filename, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(mime_type, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(temp_dir, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_media_file(ptr, media_source, ptr0, len0, ptr1, len1, use_cache, ptr2, len2);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_media_preview_display_policy(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_media_preview_display_policy(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} media_source
 * @param {bigint} width
 * @param {bigint} height
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_media_thumbnail(ptr, media_source, width, height) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_media_thumbnail(ptr, media_source, width, height);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_notification_settings(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_notification_settings(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_profile(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_profile(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_recently_visited_rooms(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_recently_visited_rooms(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_room(ptr, room_id, f_status_) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_room(ptr, ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_alias
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_room_preview_from_room_alias(ptr, room_alias) {
    const ptr0 = passArray8ToWasm0(room_alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_room_preview_from_room_alias(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {Uint8Array} via_servers
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_room_preview_from_room_id(ptr, room_id, via_servers) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(via_servers, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_room_preview_from_room_id(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_session_verification_controller(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_session_verification_controller(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} url
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_url(ptr, url) {
    const ptr0 = passArray8ToWasm0(url, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_get_url(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_homeserver(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_homeserver(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_homeserver_login_details(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_homeserver_login_details(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_ignore_user(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_ignore_user(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_ignored_users(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_ignored_users(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_is_livekit_rtc_supported(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_is_livekit_rtc_supported(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_is_report_room_api_supported(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_is_report_room_api_supported(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} alias
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_is_room_alias_available(ptr, alias) {
    const ptr0 = passArray8ToWasm0(alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_is_room_alias_available(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_join_room_by_id(ptr, room_id) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_join_room_by_id(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id_or_alias
 * @param {Uint8Array} server_names
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_join_room_by_id_or_alias(ptr, room_id_or_alias, server_names) {
    const ptr0 = passArray8ToWasm0(room_id_or_alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(server_names, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_join_room_by_id_or_alias(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id_or_alias
 * @param {Uint8Array} reason
 * @param {Uint8Array} server_names
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_knock(ptr, room_id_or_alias, reason, server_names) {
    const ptr0 = passArray8ToWasm0(room_id_or_alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(server_names, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_knock(ptr, ptr0, len0, ptr1, len1, ptr2, len2);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} username
 * @param {Uint8Array} password
 * @param {Uint8Array} initial_device_name
 * @param {Uint8Array} device_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_login(ptr, username, password, initial_device_name, device_id) {
    const ptr0 = passArray8ToWasm0(username, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(password, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(initial_device_name, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(device_id, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_login(ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} email
 * @param {Uint8Array} password
 * @param {Uint8Array} initial_device_name
 * @param {Uint8Array} device_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_login_with_email(ptr, email, password, initial_device_name, device_id) {
    const ptr0 = passArray8ToWasm0(email, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(password, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(initial_device_name, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(device_id, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_login_with_email(ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} callback_url
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_login_with_oidc_callback(ptr, callback_url) {
    const ptr0 = passArray8ToWasm0(callback_url, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_login_with_oidc_callback(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_logout(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_logout(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_new_grant_login_with_qr_code_handler(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_new_grant_login_with_qr_code_handler(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} oidc_configuration
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_new_login_with_qr_code_handler(ptr, oidc_configuration, f_status_) {
    const ptr0 = passArray8ToWasm0(oidc_configuration, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_new_login_with_qr_code_handler(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} process_setup
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_notification_client(ptr, process_setup) {
    const ptr0 = passArray8ToWasm0(process_setup, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_notification_client(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_type
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_observe_account_data_event(ptr, event_type, listener, f_status_) {
    const ptr0 = passArray8ToWasm0(event_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_observe_account_data_event(ptr, ptr0, len0, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {Uint8Array} event_type
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_observe_room_account_data_event(ptr, room_id, event_type, listener, f_status_) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(event_type, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_observe_room_account_data_event(ptr, ptr0, len0, ptr1, len1, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_register_notification_handler(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_register_notification_handler(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_remove_avatar(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_remove_avatar(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_reset_server_info(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_reset_server_info(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_alias
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_resolve_room_alias(ptr, room_alias) {
    const ptr0 = passArray8ToWasm0(room_alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_resolve_room_alias(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} session
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_restore_session(ptr, session) {
    const ptr0 = passArray8ToWasm0(session, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_restore_session(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} session
 * @param {Uint8Array} room_load_settings
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_restore_session_with(ptr, session, room_load_settings) {
    const ptr0 = passArray8ToWasm0(session, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(room_load_settings, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_restore_session_with(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_alias
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_room_alias_exists(ptr, room_alias) {
    const ptr0 = passArray8ToWasm0(room_alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_room_alias_exists(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_room_directory_search(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_room_directory_search(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_rooms(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_rooms(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} search_term
 * @param {bigint} limit
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_search_users(ptr, search_term, limit) {
    const ptr0 = passArray8ToWasm0(search_term, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_search_users(ptr, ptr0, len0, limit);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_server(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_server(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_server_vendor_info(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_server_vendor_info(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_session(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_session(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_type
 * @param {Uint8Array} content
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_account_data(ptr, event_type, content) {
    const ptr0 = passArray8ToWasm0(event_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(content, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_account_data(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} delegate
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_delegate(ptr, delegate, f_status_) {
    const ptr0 = passArray8ToWasm0(delegate, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_delegate(ptr, ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} name
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_display_name(ptr, name) {
    const ptr0 = passArray8ToWasm0(name, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_display_name(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} policy
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_invite_avatars_display_policy(ptr, policy) {
    const ptr0 = passArray8ToWasm0(policy, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_invite_avatars_display_policy(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} policy
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_media_preview_display_policy(ptr, policy) {
    const ptr0 = passArray8ToWasm0(policy, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_media_preview_display_policy(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} policy
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_media_retention_policy(ptr, policy) {
    const ptr0 = passArray8ToWasm0(policy, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_media_retention_policy(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} identifiers
 * @param {Uint8Array} kind
 * @param {Uint8Array} app_display_name
 * @param {Uint8Array} device_display_name
 * @param {Uint8Array} profile_tag
 * @param {Uint8Array} lang
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_pusher(ptr, identifiers, kind, app_display_name, device_display_name, profile_tag, lang) {
    const ptr0 = passArray8ToWasm0(identifiers, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(kind, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(app_display_name, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(device_display_name, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArray8ToWasm0(profile_tag, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    const ptr5 = passArray8ToWasm0(lang, wasm.__wbindgen_malloc);
    const len5 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_pusher(ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} utd_delegate
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_utd_delegate(ptr, utd_delegate) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_set_utd_delegate(ptr, utd_delegate);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_sliding_sync_version(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_sliding_sync_version(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_space_service(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_space_service(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} redirect_url
 * @param {Uint8Array} idp_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_start_sso_login(ptr, redirect_url, idp_id) {
    const ptr0 = passArray8ToWasm0(redirect_url, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(idp_id, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_start_sso_login(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_ignored_users(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_ignored_users(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_media_preview_config(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_media_preview_config(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_room_info(ptr, room_id, listener) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_room_info(ptr, ptr0, len0, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_send_queue_status(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_send_queue_status(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_send_queue_updates(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_subscribe_to_send_queue_updates(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_sync_service(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_sync_service(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_track_recently_visited_room(ptr, room) {
    const ptr0 = passArray8ToWasm0(room, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_track_recently_visited_room(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_unignore_user(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_unignore_user(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} mime_type
 * @param {Uint8Array} data
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_upload_avatar(ptr, mime_type, data) {
    const ptr0 = passArray8ToWasm0(mime_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_upload_avatar(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} mime_type
 * @param {Uint8Array} data
 * @param {Uint8Array} progress_watcher
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_upload_media(ptr, mime_type, data, progress_watcher) {
    const ptr0 = passArray8ToWasm0(mime_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(progress_watcher, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_upload_media(ptr, ptr0, len0, ptr1, len1, ptr2, len2);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} oidc_configuration
 * @param {Uint8Array} prompt
 * @param {Uint8Array} login_hint
 * @param {Uint8Array} device_id
 * @param {Uint8Array} additional_scopes
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_url_for_oidc(ptr, oidc_configuration, prompt, login_hint, device_id, additional_scopes) {
    const ptr0 = passArray8ToWasm0(oidc_configuration, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(prompt, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(login_hint, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(device_id, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArray8ToWasm0(additional_scopes, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_url_for_oidc(ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_user_id(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_user_id(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_client_user_id_server_name(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_client_user_id_server_name(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_clientbuilder(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_clientbuilder(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_clientbuilder(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_clientbuilder(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_clientbuilder_new(f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_clientbuilder_new(f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} certificates
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_add_root_certificates(ptr, certificates, f_status_) {
    const ptr0 = passArray8ToWasm0(certificates, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_add_root_certificates(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} auto_enable_backups
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_auto_enable_backups(ptr, auto_enable_backups, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_auto_enable_backups(ptr, auto_enable_backups, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} auto_enable_cross_signing
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_auto_enable_cross_signing(ptr, auto_enable_cross_signing, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_auto_enable_cross_signing(ptr, auto_enable_cross_signing, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} backup_download_strategy
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_backup_download_strategy(ptr, backup_download_strategy, f_status_) {
    const ptr0 = passArray8ToWasm0(backup_download_strategy, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_backup_download_strategy(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_build(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_build(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} holder_name
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_cross_process_store_locks_holder_name(ptr, holder_name, f_status_) {
    const ptr0 = passArray8ToWasm0(holder_name, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_cross_process_store_locks_holder_name(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} decryption_settings
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_decryption_settings(ptr, decryption_settings, f_status_) {
    const ptr0 = passArray8ToWasm0(decryption_settings, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_decryption_settings(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_disable_automatic_token_refresh(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_disable_automatic_token_refresh(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_disable_built_in_root_certificates(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_disable_built_in_root_certificates(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_disable_ssl_verification(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_disable_ssl_verification(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_enable_oidc_refresh_lock(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_enable_oidc_refresh_lock(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} enable_share_history_on_invite
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_enable_share_history_on_invite(ptr, enable_share_history_on_invite, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_enable_share_history_on_invite(ptr, enable_share_history_on_invite, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} url
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_homeserver_url(ptr, url, f_status_) {
    const ptr0 = passArray8ToWasm0(url, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_homeserver_url(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_in_memory_store(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_in_memory_store(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} config
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_indexeddb_store(ptr, config, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_indexeddb_store(ptr, config, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} url
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_proxy(ptr, url, f_status_) {
    const ptr0 = passArray8ToWasm0(url, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_proxy(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} config
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_request_config(ptr, config, f_status_) {
    const ptr0 = passArray8ToWasm0(config, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_request_config(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} strategy
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_room_key_recipient_strategy(ptr, strategy, f_status_) {
    const ptr0 = passArray8ToWasm0(strategy, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_room_key_recipient_strategy(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} server_name
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_server_name(ptr, server_name, f_status_) {
    const ptr0 = passArray8ToWasm0(server_name, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_server_name(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} server_name_or_url
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_server_name_or_homeserver_url(ptr, server_name_or_url, f_status_) {
    const ptr0 = passArray8ToWasm0(server_name_or_url, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_server_name_or_homeserver_url(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} session_delegate
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_set_session_delegate(ptr, session_delegate, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_set_session_delegate(ptr, session_delegate, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} version_builder
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_sliding_sync_version_builder(ptr, version_builder, f_status_) {
    const ptr0 = passArray8ToWasm0(version_builder, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_sliding_sync_version_builder(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_system_is_memory_constrained(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_system_is_memory_constrained(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} enabled
 * @param {number} thread_subscriptions
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_threads_enabled(ptr, enabled, thread_subscriptions, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_threads_enabled(ptr, enabled, thread_subscriptions, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_agent
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_user_agent(ptr, user_agent, f_status_) {
    const ptr0 = passArray8ToWasm0(user_agent, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_user_agent(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} username
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_username(ptr, username, f_status_) {
    const ptr0 = passArray8ToWasm0(username, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_clientbuilder_username(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_encryption(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_encryption(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_encryption(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_encryption(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_backup_exists_on_server(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_backup_exists_on_server(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_backup_state(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_backup_state(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_backup_state_listener(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_backup_state_listener(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_curve25519_key(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_curve25519_key(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_disable_recovery(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_disable_recovery(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_ed25519_key(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_ed25519_key(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_enable_backups(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_enable_backups(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} wait_for_backups_to_upload
 * @param {Uint8Array} passphrase
 * @param {bigint} progress_listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_enable_recovery(ptr, wait_for_backups_to_upload, passphrase, progress_listener) {
    const ptr0 = passArray8ToWasm0(passphrase, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_enable_recovery(ptr, wait_for_backups_to_upload, ptr0, len0, progress_listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_has_devices_to_verify_against(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_has_devices_to_verify_against(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_is_last_device(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_is_last_device(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} recovery_key
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_recover(ptr, recovery_key) {
    const ptr0 = passArray8ToWasm0(recovery_key, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_recover(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} old_recovery_key
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_recover_and_reset(ptr, old_recovery_key) {
    const ptr0 = passArray8ToWasm0(old_recovery_key, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_recover_and_reset(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_recovery_state(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_recovery_state(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_recovery_state_listener(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_recovery_state_listener(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_reset_identity(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_reset_identity(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_reset_recovery_key(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_reset_recovery_key(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {number} fallback_to_server
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_user_identity(ptr, user_id, fallback_to_server) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_user_identity(ptr, ptr0, len0, fallback_to_server);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_verification_state(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_verification_state(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_verification_state_listener(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_verification_state_listener(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} progress_listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_wait_for_backup_upload_steady_state(ptr, progress_listener) {
    const ptr0 = passArray8ToWasm0(progress_listener, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_wait_for_backup_upload_steady_state(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_wait_for_e2ee_initialization_tasks(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_encryption_wait_for_e2ee_initialization_tasks(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_grantloginwithqrcodehandler(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_grantloginwithqrcodehandler(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_grantloginwithqrcodehandler(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_grantloginwithqrcodehandler(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {bigint} progress_listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_grantloginwithqrcodehandler_generate(ptr, progress_listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_grantloginwithqrcodehandler_generate(ptr, progress_listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} qr_code_data
 * @param {bigint} progress_listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_grantloginwithqrcodehandler_scan(ptr, qr_code_data, progress_listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_grantloginwithqrcodehandler_scan(ptr, qr_code_data, progress_listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_homeserverlogindetails(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_homeserverlogindetails(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_homeserverlogindetails(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_homeserverlogindetails(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_sliding_sync_version(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_sliding_sync_version(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_supported_oidc_prompts(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_supported_oidc_prompts(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_supports_oidc_login(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_supports_oidc_login(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_supports_password_login(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_supports_password_login(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_supports_sso_login(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_supports_sso_login(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_url(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_homeserverlogindetails_url(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_identityresethandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_identityresethandle(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_identityresethandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_identityresethandle(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_identityresethandle_auth_type(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_identityresethandle_auth_type(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_identityresethandle_cancel(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_identityresethandle_cancel(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} auth
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_identityresethandle_reset(ptr, auth) {
    const ptr0 = passArray8ToWasm0(auth, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_identityresethandle_reset(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_inreplytodetails(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_inreplytodetails(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_inreplytodetails(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_inreplytodetails(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_inreplytodetails_event(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_inreplytodetails_event(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_inreplytodetails_event_id(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_inreplytodetails_event_id(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_indexeddbstorebuilder(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_indexeddbstorebuilder(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_indexeddbstorebuilder(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_indexeddbstorebuilder(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {Uint8Array} name
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_indexeddbstorebuilder_new(name, f_status_) {
    const ptr0 = passArray8ToWasm0(name, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_indexeddbstorebuilder_new(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} passphrase
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_indexeddbstorebuilder_passphrase(ptr, passphrase, f_status_) {
    const ptr0 = passArray8ToWasm0(passphrase, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_indexeddbstorebuilder_passphrase(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_knockrequestactions(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_knockrequestactions(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_knockrequestactions(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_knockrequestactions(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_knockrequestactions_accept(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_knockrequestactions_accept(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} reason
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_knockrequestactions_decline(ptr, reason) {
    const ptr0 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_knockrequestactions_decline(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} reason
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_knockrequestactions_decline_and_ban(ptr, reason) {
    const ptr0 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_knockrequestactions_decline_and_ban(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_knockrequestactions_mark_as_seen(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_knockrequestactions_mark_as_seen(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_lazytimelineitemprovider(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_lazytimelineitemprovider(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_lazytimelineitemprovider(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_lazytimelineitemprovider(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_lazytimelineitemprovider_contains_only_emojis(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_lazytimelineitemprovider_contains_only_emojis(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_lazytimelineitemprovider_debug_info(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_lazytimelineitemprovider_debug_info(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_lazytimelineitemprovider_get_send_handle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_lazytimelineitemprovider_get_send_handle(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {number} strict
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_lazytimelineitemprovider_get_shields(ptr, strict, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_lazytimelineitemprovider_get_shields(ptr, strict, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_leavespacehandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_leavespacehandle(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_leavespacehandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_leavespacehandle(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_ids
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_leavespacehandle_leave(ptr, room_ids) {
    const ptr0 = passArray8ToWasm0(room_ids, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_leavespacehandle_leave(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_leavespacehandle_rooms(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_leavespacehandle_rooms(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_loginwithqrcodehandler(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_loginwithqrcodehandler(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_loginwithqrcodehandler(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_loginwithqrcodehandler(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {bigint} progress_listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_loginwithqrcodehandler_generate(ptr, progress_listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_loginwithqrcodehandler_generate(ptr, progress_listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} qr_code_data
 * @param {bigint} progress_listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_loginwithqrcodehandler_scan(ptr, qr_code_data, progress_listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_loginwithqrcodehandler_scan(ptr, qr_code_data, progress_listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_mediafilehandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_mediafilehandle(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_mediafilehandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_mediafilehandle(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_mediafilehandle_path(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_mediafilehandle_path(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} path
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_mediafilehandle_persist(ptr, path, f_status_) {
    const ptr0 = passArray8ToWasm0(path, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_mediafilehandle_persist(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_mediasource(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_mediasource(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_mediasource(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_mediasource(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {Uint8Array} json
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_mediasource_from_json(json, f_status_) {
    const ptr0 = passArray8ToWasm0(json, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_mediasource_from_json(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} url
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_mediasource_from_url(url, f_status_) {
    const ptr0 = passArray8ToWasm0(url, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_mediasource_from_url(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_mediasource_to_json(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_mediasource_to_json(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_mediasource_url(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_mediasource_url(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_notificationclient(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_notificationclient(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_notificationclient(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_notificationclient(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationclient_get_notification(ptr, room_id, event_id) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationclient_get_notification(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} requests
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationclient_get_notifications(ptr, requests) {
    const ptr0 = passArray8ToWasm0(requests, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationclient_get_notifications(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationclient_get_room(ptr, room_id, f_status_) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationclient_get_room(ptr, ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_notificationsettings(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_notificationsettings(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_notificationsettings(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_notificationsettings(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_can_homeserver_push_encrypted_event_to_device(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_can_homeserver_push_encrypted_event_to_device(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_can_push_encrypted_event_to_device(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_can_push_encrypted_event_to_device(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_contains_keywords_rules(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_contains_keywords_rules(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} is_encrypted
 * @param {number} is_one_to_one
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_default_room_notification_mode(ptr, is_encrypted, is_one_to_one) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_default_room_notification_mode(ptr, is_encrypted, is_one_to_one);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_raw_push_rules(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_raw_push_rules(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {number} is_encrypted
 * @param {number} is_one_to_one
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_room_notification_settings(ptr, room_id, is_encrypted, is_one_to_one) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_room_notification_settings(ptr, ptr0, len0, is_encrypted, is_one_to_one);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} enabled
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_rooms_with_user_defined_rules(ptr, enabled) {
    const ptr0 = passArray8ToWasm0(enabled, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_rooms_with_user_defined_rules(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_user_defined_room_notification_mode(ptr, room_id) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_get_user_defined_room_notification_mode(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_is_call_enabled(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_is_call_enabled(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_is_invite_for_me_enabled(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_is_invite_for_me_enabled(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_is_room_mention_enabled(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_is_room_mention_enabled(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_is_user_mention_enabled(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_is_user_mention_enabled(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_restore_default_room_notification_mode(ptr, room_id) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_restore_default_room_notification_mode(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} enabled
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_call_enabled(ptr, enabled) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_call_enabled(ptr, enabled);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} rule_id
 * @param {Uint8Array} rule_kind
 * @param {Uint8Array} actions
 * @param {Uint8Array} conditions
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_custom_push_rule(ptr, rule_id, rule_kind, actions, conditions) {
    const ptr0 = passArray8ToWasm0(rule_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(rule_kind, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(actions, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(conditions, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_custom_push_rule(ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} is_encrypted
 * @param {number} is_one_to_one
 * @param {Uint8Array} mode
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_default_room_notification_mode(ptr, is_encrypted, is_one_to_one, mode) {
    const ptr0 = passArray8ToWasm0(mode, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_default_room_notification_mode(ptr, is_encrypted, is_one_to_one, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} delegate
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_delegate(ptr, delegate, f_status_) {
    const ptr0 = passArray8ToWasm0(delegate, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_delegate(ptr, ptr0, len0, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {number} enabled
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_invite_for_me_enabled(ptr, enabled) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_invite_for_me_enabled(ptr, enabled);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} enabled
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_room_mention_enabled(ptr, enabled) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_room_mention_enabled(ptr, enabled);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {Uint8Array} mode
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_room_notification_mode(ptr, room_id, mode) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(mode, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_room_notification_mode(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} enabled
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_user_mention_enabled(ptr, enabled) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_set_user_mention_enabled(ptr, enabled);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {number} is_encrypted
 * @param {number} is_one_to_one
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_unmute_room(ptr, room_id, is_encrypted, is_one_to_one) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_notificationsettings_unmute_room(ptr, ptr0, len0, is_encrypted, is_one_to_one);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_qrcodedata(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_qrcodedata(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_qrcodedata(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_qrcodedata(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {Uint8Array} bytes
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_qrcodedata_from_bytes(bytes, f_status_) {
    const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_qrcodedata_from_bytes(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_qrcodedata_server_name(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_qrcodedata_server_name(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_room(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_room(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_room(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_room(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_active_members_count(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_active_members_count(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_active_room_call_participants(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_active_room_call_participants(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_alternative_aliases(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_alternative_aliases(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} changes
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_apply_power_level_changes(ptr, changes) {
    const ptr0 = passArray8ToWasm0(changes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_apply_power_level_changes(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_avatar_url(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_avatar_url(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {Uint8Array} reason
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_ban_user(ptr, user_id, reason) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_ban_user(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_canonical_alias(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_canonical_alias(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} thread_root
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_clear_composer_draft(ptr, thread_root) {
    const ptr0 = passArray8ToWasm0(thread_root, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_clear_composer_draft(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_clear_event_cache_storage(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_clear_event_cache_storage(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} rtc_notification_event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_decline_call(ptr, rtc_notification_event_id) {
    const ptr0 = passArray8ToWasm0(rtc_notification_event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_decline_call(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_discard_room_key(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_discard_room_key(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_display_name(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_display_name(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @param {bigint} new_content
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_edit(ptr, event_id, new_content) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_edit(ptr, ptr0, len0, new_content);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_enable_encryption(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_enable_encryption(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} enable
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_enable_send_queue(ptr, enable, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_enable_send_queue(ptr, enable, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_encryption_state(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_encryption_state(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} thread_root_event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_fetch_thread_subscription(ptr, thread_root_event_id) {
    const ptr0 = passArray8ToWasm0(thread_root_event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_fetch_thread_subscription(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_forget(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_forget(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_get_power_levels(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_get_power_levels(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_get_room_visibility(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_get_room_visibility(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_has_active_room_call(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_has_active_room_call(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_heroes(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_heroes(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_id(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_id(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} devices
 * @param {bigint} send_handle
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_ignore_device_trust_and_resend(ptr, devices, send_handle) {
    const ptr0 = passArray8ToWasm0(devices, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_ignore_device_trust_and_resend(ptr, ptr0, len0, send_handle);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_ignore_user(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_ignore_user(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_invite_user_by_id(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_invite_user_by_id(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_invited_members_count(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_invited_members_count(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_inviter(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_inviter(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_direct(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_direct(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_encrypted(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_encrypted(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_public(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_public(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_send_queue_enabled(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_send_queue_enabled(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_space(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_is_space(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_join(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_join(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_joined_members_count(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_joined_members_count(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {Uint8Array} reason
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_kick_user(ptr, user_id, reason) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_kick_user(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_latest_encryption_state(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_latest_encryption_state(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_latest_event(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_latest_event(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_leave(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_leave(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} thread_root
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_load_composer_draft(ptr, thread_root) {
    const ptr0 = passArray8ToWasm0(thread_root, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_load_composer_draft(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_load_or_fetch_event(ptr, event_id) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_load_or_fetch_event(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_mark_as_fully_read_unchecked(ptr, event_id) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_mark_as_fully_read_unchecked(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} receipt_type
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_mark_as_read(ptr, receipt_type) {
    const ptr0 = passArray8ToWasm0(receipt_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_mark_as_read(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_matrix_to_event_permalink(ptr, event_id) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_matrix_to_event_permalink(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_matrix_to_permalink(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_matrix_to_permalink(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_member(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_member(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_member_avatar_url(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_member_avatar_url(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_member_display_name(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_member_display_name(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_member_with_sender_info(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_member_with_sender_info(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_members(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_members(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_members_no_sync(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_members_no_sync(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_membership(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_membership(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_new_latest_event(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_new_latest_event(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_own_user_id(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_own_user_id(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_predecessor_room(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_predecessor_room(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} via
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_preview_room(ptr, via) {
    const ptr0 = passArray8ToWasm0(via, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_preview_room(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} alias
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_publish_room_alias_in_room_directory(ptr, alias) {
    const ptr0 = passArray8ToWasm0(alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_publish_room_alias_in_room_directory(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_raw_name(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_raw_name(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @param {Uint8Array} reason
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_redact(ptr, event_id, reason) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_redact(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_remove_avatar(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_remove_avatar(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} alias
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_remove_room_alias_from_room_directory(ptr, alias) {
    const ptr0 = passArray8ToWasm0(alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_remove_room_alias_from_room_directory(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @param {Uint8Array} score
 * @param {Uint8Array} reason
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_report_content(ptr, event_id, score, reason) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(score, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_report_content(ptr, ptr0, len0, ptr1, len1, ptr2, len2);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} reason
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_report_room(ptr, reason) {
    const ptr0 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_report_room(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_reset_power_levels(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_reset_power_levels(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_room_events_debug_string(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_room_events_debug_string(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_room_info(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_room_info(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} draft
 * @param {Uint8Array} thread_root
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_save_composer_draft(ptr, draft, thread_root) {
    const ptr0 = passArray8ToWasm0(draft, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(thread_root, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_save_composer_draft(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} geo_uri
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_send_live_location(ptr, geo_uri) {
    const ptr0 = passArray8ToWasm0(geo_uri, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_send_live_location(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_type
 * @param {Uint8Array} content
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_send_raw(ptr, event_type, content) {
    const ptr0 = passArray8ToWasm0(event_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(content, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_send_raw(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} is_favourite
 * @param {Uint8Array} tag_order
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_is_favourite(ptr, is_favourite, tag_order) {
    const ptr0 = passArray8ToWasm0(tag_order, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_is_favourite(ptr, is_favourite, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} is_low_priority
 * @param {Uint8Array} tag_order
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_is_low_priority(ptr, is_low_priority, tag_order) {
    const ptr0 = passArray8ToWasm0(tag_order, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_is_low_priority(ptr, is_low_priority, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} name
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_name(ptr, name) {
    const ptr0 = passArray8ToWasm0(name, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_name(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} thread_root_event_id
 * @param {number} subscribed
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_thread_subscription(ptr, thread_root_event_id, subscribed) {
    const ptr0 = passArray8ToWasm0(thread_root_event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_thread_subscription(ptr, ptr0, len0, subscribed);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} topic
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_topic(ptr, topic) {
    const ptr0 = passArray8ToWasm0(topic, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_topic(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} new_value
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_unread_flag(ptr, new_value) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_set_unread_flag(ptr, new_value);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} duration_millis
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_start_live_location_share(ptr, duration_millis) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_start_live_location_share(ptr, duration_millis);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_stop_live_location_share(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_stop_live_location_share(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} rtc_notification_event_id
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_call_decline_events(ptr, rtc_notification_event_id, listener, f_status_) {
    const ptr0 = passArray8ToWasm0(rtc_notification_event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_call_decline_events(ptr, ptr0, len0, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_identity_status_changes(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_identity_status_changes(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_knock_requests(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_knock_requests(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_live_location_shares(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_live_location_shares(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_room_info_updates(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_room_info_updates(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_send_queue_updates(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_send_queue_updates(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_typing_notifications(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_subscribe_to_typing_notifications(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_successor_room(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_successor_room(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_suggested_role_for_user(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_suggested_role_for_user(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_timeline(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_timeline(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} configuration
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_timeline_with_configuration(ptr, configuration) {
    const ptr0 = passArray8ToWasm0(configuration, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_timeline_with_configuration(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_topic(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_topic(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {number} is_typing
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_typing_notice(ptr, is_typing) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_typing_notice(ptr, is_typing);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {Uint8Array} reason
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_unban_user(ptr, user_id, reason) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_unban_user(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} alias
 * @param {Uint8Array} alt_aliases
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_canonical_alias(ptr, alias, alt_aliases) {
    const ptr0 = passArray8ToWasm0(alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(alt_aliases, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_canonical_alias(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} visibility
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_history_visibility(ptr, visibility) {
    const ptr0 = passArray8ToWasm0(visibility, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_history_visibility(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} new_rule
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_join_rules(ptr, new_rule) {
    const ptr0 = passArray8ToWasm0(new_rule, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_join_rules(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} updates
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_power_levels_for_users(ptr, updates) {
    const ptr0 = passArray8ToWasm0(updates, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_power_levels_for_users(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} visibility
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_room_visibility(ptr, visibility) {
    const ptr0 = passArray8ToWasm0(visibility, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_update_room_visibility(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} mime_type
 * @param {Uint8Array} data
 * @param {Uint8Array} media_info
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_upload_avatar(ptr, mime_type, data, media_info) {
    const ptr0 = passArray8ToWasm0(mime_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(media_info, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_upload_avatar(ptr, ptr0, len0, ptr1, len1, ptr2, len2);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_ids
 * @param {bigint} send_handle
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_room_withdraw_verification_and_resend(ptr, user_ids, send_handle) {
    const ptr0 = passArray8ToWasm0(user_ids, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_room_withdraw_verification_and_resend(ptr, ptr0, len0, send_handle);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomdirectorysearch(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomdirectorysearch(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_roomdirectorysearch(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_roomdirectorysearch(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_is_at_last_page(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_is_at_last_page(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_loaded_pages(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_loaded_pages(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_next_page(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_next_page(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_results(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_results(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} filter
 * @param {number} batch_size
 * @param {Uint8Array} via_server_name
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_search(ptr, filter, batch_size, via_server_name) {
    const ptr0 = passArray8ToWasm0(filter, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(via_server_name, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomdirectorysearch_search(ptr, ptr0, len0, batch_size, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomlist(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomlist(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_roomlist(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_roomlist(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {number} page_size
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlist_entries_with_dynamic_adapters(ptr, page_size, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlist_entries_with_dynamic_adapters(ptr, page_size, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} page_size
 * @param {number} enable_latest_event_sorter
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlist_entries_with_dynamic_adapters_with(ptr, page_size, enable_latest_event_sorter, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlist_entries_with_dynamic_adapters_with(ptr, page_size, enable_latest_event_sorter, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlist_loading_state(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlist_loading_state(ptr, listener, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlist_room(ptr, room_id, f_status_) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlist_room(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomlistdynamicentriescontroller(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomlistdynamicentriescontroller(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_roomlistdynamicentriescontroller(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_roomlistdynamicentriescontroller(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistdynamicentriescontroller_add_one_page(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistdynamicentriescontroller_add_one_page(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistdynamicentriescontroller_reset_to_one_page(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistdynamicentriescontroller_reset_to_one_page(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} kind
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistdynamicentriescontroller_set_filter(ptr, kind, f_status_) {
    const ptr0 = passArray8ToWasm0(kind, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistdynamicentriescontroller_set_filter(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomlistentrieswithdynamicadaptersresult(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomlistentrieswithdynamicadaptersresult(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_roomlistentrieswithdynamicadaptersresult(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_roomlistentrieswithdynamicadaptersresult(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistentrieswithdynamicadaptersresult_controller(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistentrieswithdynamicadaptersresult_controller(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistentrieswithdynamicadaptersresult_entries_stream(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistentrieswithdynamicadaptersresult_entries_stream(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomlistservice(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_roomlistservice(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_roomlistservice(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_roomlistservice(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_all_rooms(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_all_rooms(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_id
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_room(ptr, room_id, f_status_) {
    const ptr0 = passArray8ToWasm0(room_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_room(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_state(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_state(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} room_ids
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_subscribe_to_rooms(ptr, room_ids) {
    const ptr0 = passArray8ToWasm0(room_ids, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_subscribe_to_rooms(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} delay_before_showing_in_ms
 * @param {number} delay_before_hiding_in_ms
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_sync_indicator(ptr, delay_before_showing_in_ms, delay_before_hiding_in_ms, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roomlistservice_sync_indicator(ptr, delay_before_showing_in_ms, delay_before_hiding_in_ms, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_roommembersiterator(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_roommembersiterator(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_roommembersiterator(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_roommembersiterator(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roommembersiterator_len(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roommembersiterator_len(ptr, f_status_.__wbg_ptr);
    return ret >>> 0;
}

/**
 * @param {bigint} ptr
 * @param {number} chunk_size
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roommembersiterator_next_chunk(ptr, chunk_size, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roommembersiterator_next_chunk(ptr, chunk_size, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_roommessageeventcontentwithoutrelation(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_roommessageeventcontentwithoutrelation(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_roommessageeventcontentwithoutrelation(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_roommessageeventcontentwithoutrelation(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} mentions
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roommessageeventcontentwithoutrelation_with_mentions(ptr, mentions, f_status_) {
    const ptr0 = passArray8ToWasm0(mentions, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roommessageeventcontentwithoutrelation_with_mentions(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_roompowerlevels(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_roompowerlevels(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_roompowerlevels(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_roompowerlevels(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_ban(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_ban(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_invite(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_invite(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_kick(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_kick(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_pin_unpin(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_pin_unpin(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_redact_other(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_redact_other(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_redact_own(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_redact_own(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} message
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_send_message(ptr, message, f_status_) {
    const ptr0 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_send_message(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} state_event
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_send_state(ptr, state_event, f_status_) {
    const ptr0 = passArray8ToWasm0(state_event, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_send_state(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_trigger_room_notification(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_own_user_trigger_room_notification(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_ban(ptr, user_id, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_ban(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_invite(ptr, user_id, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_invite(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_kick(ptr, user_id, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_kick(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_pin_unpin(ptr, user_id, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_pin_unpin(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_redact_other(ptr, user_id, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_redact_other(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_redact_own(ptr, user_id, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_redact_own(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {Uint8Array} message
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_send_message(ptr, user_id, message, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_send_message(ptr, ptr0, len0, ptr1, len1, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {Uint8Array} state_event
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_send_state(ptr, user_id, state_event, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(state_event, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_send_state(ptr, ptr0, len0, ptr1, len1, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_trigger_room_notification(ptr, user_id, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_can_user_trigger_room_notification(ptr, ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_user_power_levels(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_user_power_levels(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_values(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompowerlevels_values(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_roompreview(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_roompreview(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_roompreview(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_roompreview(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_forget(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_forget(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_info(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_info(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_inviter(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_inviter(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_leave(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_leave(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_own_membership_details(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_roompreview_own_membership_details(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_sendattachmentjoinhandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_sendattachmentjoinhandle(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_sendattachmentjoinhandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_sendattachmentjoinhandle(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sendattachmentjoinhandle_cancel(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sendattachmentjoinhandle_cancel(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sendattachmentjoinhandle_join(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sendattachmentjoinhandle_join(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_sendhandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_sendhandle(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_sendhandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_sendhandle(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sendhandle_abort(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sendhandle_abort(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sendhandle_try_resend(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sendhandle_try_resend(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_sessionverificationcontroller(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_sessionverificationcontroller(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_sessionverificationcontroller(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_sessionverificationcontroller(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_accept_verification_request(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_accept_verification_request(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} sender_id
 * @param {Uint8Array} flow_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_acknowledge_verification_request(ptr, sender_id, flow_id) {
    const ptr0 = passArray8ToWasm0(sender_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(flow_id, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_acknowledge_verification_request(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_approve_verification(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_approve_verification(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_cancel_verification(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_cancel_verification(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_decline_verification(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_decline_verification(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_request_device_verification(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_request_device_verification(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} user_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_request_user_verification(ptr, user_id) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_request_user_verification(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} delegate
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_set_delegate(ptr, delegate, f_status_) {
    const ptr0 = passArray8ToWasm0(delegate, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_set_delegate(ptr, ptr0, len0, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_start_sas_verification(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationcontroller_start_sas_verification(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_sessionverificationemoji(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_sessionverificationemoji(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_sessionverificationemoji(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_sessionverificationemoji(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationemoji_description(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationemoji_description(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationemoji_symbol(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_sessionverificationemoji_symbol(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_spaceroomlist(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_spaceroomlist(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_spaceroomlist(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_spaceroomlist(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_paginate(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_paginate(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_pagination_state(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_pagination_state(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_rooms(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_rooms(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_space(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_space(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_subscribe_to_pagination_state_updates(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_subscribe_to_pagination_state_updates(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_subscribe_to_room_update(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_subscribe_to_room_update(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_subscribe_to_space_updates(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceroomlist_subscribe_to_space_updates(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_spaceservice(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_spaceservice(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_spaceservice(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_spaceservice(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} child_id
 * @param {Uint8Array} space_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_add_child_to_space(ptr, child_id, space_id) {
    const ptr0 = passArray8ToWasm0(child_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(space_id, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_add_child_to_space(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_editable_spaces(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_editable_spaces(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} child_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_joined_parents_of_child(ptr, child_id) {
    const ptr0 = passArray8ToWasm0(child_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_joined_parents_of_child(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_joined_spaces(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_joined_spaces(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} space_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_leave_space(ptr, space_id) {
    const ptr0 = passArray8ToWasm0(space_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_leave_space(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} child_id
 * @param {Uint8Array} space_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_remove_child_from_space(ptr, child_id, space_id) {
    const ptr0 = passArray8ToWasm0(child_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(space_id, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_remove_child_from_space(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} space_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_space_room_list(ptr, space_id) {
    const ptr0 = passArray8ToWasm0(space_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_space_room_list(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_subscribe_to_joined_spaces(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_spaceservice_subscribe_to_joined_spaces(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_span(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_span(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_span(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_span(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_span_current(f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_span_current(f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} file
 * @param {Uint8Array} line
 * @param {Uint8Array} level
 * @param {Uint8Array} target
 * @param {Uint8Array} name
 * @param {Uint8Array} bridge_trace_id
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_span_new(file, line, level, target, name, bridge_trace_id, f_status_) {
    const ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(line, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(level, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(target, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArray8ToWasm0(name, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    const ptr5 = passArray8ToWasm0(bridge_trace_id, wasm.__wbindgen_malloc);
    const len5 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_span_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} target
 * @param {Uint8Array} parent_trace_id
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_span_new_bridge_span(target, parent_trace_id, f_status_) {
    const ptr0 = passArray8ToWasm0(target, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(parent_trace_id, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_span_new_bridge_span(ptr0, len0, ptr1, len1, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_span_enter(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_span_enter(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_span_exit(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_span_exit(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_span_is_none(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_span_is_none(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_ssohandler(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_ssohandler(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_ssohandler(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_ssohandler(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} callback_url
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_ssohandler_finish(ptr, callback_url) {
    const ptr0 = passArray8ToWasm0(callback_url, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_ssohandler_finish(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_ssohandler_url(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_ssohandler_url(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_syncservice(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_syncservice(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_syncservice(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_syncservice(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_expire_sessions(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_expire_sessions(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_room_list_service(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_room_list_service(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_start(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_start(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_state(ptr, listener, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_state(ptr, listener, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_stop(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservice_stop(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_syncservicebuilder(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_syncservicebuilder(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_syncservicebuilder(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_syncservicebuilder(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservicebuilder_finish(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservicebuilder_finish(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservicebuilder_with_cross_process_lock(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservicebuilder_with_cross_process_lock(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservicebuilder_with_offline_mode(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservicebuilder_with_offline_mode(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} enable
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservicebuilder_with_share_pos(ptr, enable, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_syncservicebuilder_with_share_pos(ptr, enable, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_taskhandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_taskhandle(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_taskhandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_taskhandle(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_taskhandle_cancel(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_taskhandle_cancel(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_taskhandle_is_finished(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_taskhandle_is_finished(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_threadsummary(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_threadsummary(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_threadsummary(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_threadsummary(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_threadsummary_latest_event(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_threadsummary_latest_event(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_threadsummary_num_replies(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_threadsummary_num_replies(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_timeline(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_timeline(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_timeline(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_timeline(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_add_listener(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_add_listener(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} msg_type
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_create_message_content(ptr, msg_type, f_status_) {
    const ptr0 = passArray8ToWasm0(msg_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_create_message_content(ptr, ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} question
 * @param {Uint8Array} answers
 * @param {number} max_selections
 * @param {Uint8Array} poll_kind
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_create_poll(ptr, question, answers, max_selections, poll_kind) {
    const ptr0 = passArray8ToWasm0(question, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(answers, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(poll_kind, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_create_poll(ptr, ptr0, len0, ptr1, len1, max_selections, ptr2, len2);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_or_transaction_id
 * @param {Uint8Array} new_content
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_edit(ptr, event_or_transaction_id, new_content) {
    const ptr0 = passArray8ToWasm0(event_or_transaction_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(new_content, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_edit(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} poll_start_event_id
 * @param {Uint8Array} text
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_end_poll(ptr, poll_start_event_id, text) {
    const ptr0 = passArray8ToWasm0(poll_start_event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(text, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_end_poll(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_fetch_details_for_event(ptr, event_id) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_fetch_details_for_event(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_fetch_members(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_fetch_members(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_get_event_timeline_item_by_event_id(ptr, event_id) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_get_event_timeline_item_by_event_id(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_latest_event_id(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_latest_event_id(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id_str
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_load_reply_details(ptr, event_id_str) {
    const ptr0 = passArray8ToWasm0(event_id_str, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_load_reply_details(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} receipt_type
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_mark_as_read(ptr, receipt_type) {
    const ptr0 = passArray8ToWasm0(receipt_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_mark_as_read(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} num_events
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_paginate_backwards(ptr, num_events) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_paginate_backwards(ptr, num_events);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {number} num_events
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_paginate_forwards(ptr, num_events) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_paginate_forwards(ptr, num_events);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_pin_event(ptr, event_id) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_pin_event(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_or_transaction_id
 * @param {Uint8Array} reason
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_redact_event(ptr, event_or_transaction_id, reason) {
    const ptr0 = passArray8ToWasm0(event_or_transaction_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(reason, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_redact_event(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} session_ids
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_retry_decryption(ptr, session_ids, f_status_) {
    const ptr0 = passArray8ToWasm0(session_ids, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_retry_decryption(ptr, ptr0, len0, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {bigint} msg
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send(ptr, msg) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send(ptr, msg);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} params
 * @param {Uint8Array} audio_info
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_audio(ptr, params, audio_info, f_status_) {
    const ptr0 = passArray8ToWasm0(params, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(audio_info, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_audio(ptr, ptr0, len0, ptr1, len1, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} params
 * @param {Uint8Array} file_info
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_file(ptr, params, file_info, f_status_) {
    const ptr0 = passArray8ToWasm0(params, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(file_info, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_file(ptr, ptr0, len0, ptr1, len1, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} params
 * @param {Uint8Array} thumbnail_source
 * @param {Uint8Array} image_info
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_image(ptr, params, thumbnail_source, image_info, f_status_) {
    const ptr0 = passArray8ToWasm0(params, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(thumbnail_source, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(image_info, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_image(ptr, ptr0, len0, ptr1, len1, ptr2, len2, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} body
 * @param {Uint8Array} geo_uri
 * @param {Uint8Array} description
 * @param {Uint8Array} zoom_level
 * @param {Uint8Array} asset_type
 * @param {Uint8Array} replied_to_event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_location(ptr, body, geo_uri, description, zoom_level, asset_type, replied_to_event_id) {
    const ptr0 = passArray8ToWasm0(body, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(geo_uri, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(description, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(zoom_level, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArray8ToWasm0(asset_type, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    const ptr5 = passArray8ToWasm0(replied_to_event_id, wasm.__wbindgen_malloc);
    const len5 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_location(ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} poll_start_event_id
 * @param {Uint8Array} answers
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_poll_response(ptr, poll_start_event_id, answers) {
    const ptr0 = passArray8ToWasm0(poll_start_event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(answers, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_poll_response(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} receipt_type
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_read_receipt(ptr, receipt_type, event_id) {
    const ptr0 = passArray8ToWasm0(receipt_type, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_read_receipt(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} msg
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_reply(ptr, msg, event_id) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_reply(ptr, msg, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} params
 * @param {Uint8Array} thumbnail_source
 * @param {Uint8Array} video_info
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_video(ptr, params, thumbnail_source, video_info, f_status_) {
    const ptr0 = passArray8ToWasm0(params, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(thumbnail_source, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(video_info, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_video(ptr, ptr0, len0, ptr1, len1, ptr2, len2, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} params
 * @param {Uint8Array} audio_info
 * @param {Uint8Array} waveform
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_voice_message(ptr, params, audio_info, waveform, f_status_) {
    const ptr0 = passArray8ToWasm0(params, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(audio_info, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(waveform, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_send_voice_message(ptr, ptr0, len0, ptr1, len1, ptr2, len2, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {bigint} listener
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_subscribe_to_back_pagination_status(ptr, listener) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_subscribe_to_back_pagination_status(ptr, listener);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} item_id
 * @param {Uint8Array} key
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_toggle_reaction(ptr, item_id, key) {
    const ptr0 = passArray8ToWasm0(item_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(key, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_toggle_reaction(ptr, ptr0, len0, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} event_id
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_unpin_event(ptr, event_id) {
    const ptr0 = passArray8ToWasm0(event_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timeline_unpin_event(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_timelineevent(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_timelineevent(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_timelineevent(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_timelineevent(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_event_id(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_event_id(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_event_type(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_event_type(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_sender_id(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_sender_id(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_thread_root_event_id(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_thread_root_event_id(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_timestamp(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineevent_timestamp(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_timelineeventtypefilter(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_timelineeventtypefilter(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_timelineeventtypefilter(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_timelineeventtypefilter(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {Uint8Array} event_types
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_timelineeventtypefilter_exclude(event_types, f_status_) {
    const ptr0 = passArray8ToWasm0(event_types, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_timelineeventtypefilter_exclude(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} event_types
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_constructor_timelineeventtypefilter_include(event_types, f_status_) {
    const ptr0 = passArray8ToWasm0(event_types, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_constructor_timelineeventtypefilter_include(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_timelineitem(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_timelineitem(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_timelineitem(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_timelineitem(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineitem_as_event(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineitem_as_event(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineitem_as_virtual(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineitem_as_virtual(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineitem_fmt_debug(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineitem_fmt_debug(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineitem_unique_id(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_timelineitem_unique_id(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_unreadnotificationscount(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_unreadnotificationscount(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_unreadnotificationscount(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_unreadnotificationscount(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_unreadnotificationscount_has_notifications(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_unreadnotificationscount_has_notifications(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_unreadnotificationscount_highlight_count(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_unreadnotificationscount_highlight_count(ptr, f_status_.__wbg_ptr);
    return ret >>> 0;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_unreadnotificationscount_notification_count(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_unreadnotificationscount_notification_count(ptr, f_status_.__wbg_ptr);
    return ret >>> 0;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_useridentity(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_useridentity(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_useridentity(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_useridentity(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_has_verification_violation(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_has_verification_violation(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_is_verified(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_is_verified(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_master_key(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_master_key(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_pin(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_pin(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_was_previously_verified(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_was_previously_verified(ptr, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_withdraw_verification(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_useridentity_withdraw_verification(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_widgetdriver(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_widgetdriver(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_widgetdriver(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_widgetdriver(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {bigint} room
 * @param {bigint} capabilities_provider
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_widgetdriver_run(ptr, room, capabilities_provider) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_widgetdriver_run(ptr, room, capabilities_provider);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_clone_widgetdriverhandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_clone_widgetdriverhandle(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_free_widgetdriverhandle(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_free_widgetdriverhandle(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_widgetdriverhandle_recv(ptr) {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_widgetdriverhandle_recv(ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {Uint8Array} msg
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_method_widgetdriverhandle_send(ptr, msg) {
    const ptr0 = passArray8ToWasm0(msg, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_method_widgetdriverhandle_send(ptr, ptr0, len0);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_accountdatalistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_accountdatalistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_backupstatelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_backupstatelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_backupsteadystatelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_backupsteadystatelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_calldeclinelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_calldeclinelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_clientdelegate(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_clientdelegate(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_clientsessiondelegate(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_clientsessiondelegate(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_enablerecoveryprogresslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_enablerecoveryprogresslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_generatedqrloginprogresslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_generatedqrloginprogresslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_grantgeneratedqrloginprogresslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_grantgeneratedqrloginprogresslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_grantqrloginprogresslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_grantqrloginprogresslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_identitystatuschangelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_identitystatuschangelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_ignoreduserslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_ignoreduserslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_knockrequestslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_knockrequestslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_livelocationsharelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_livelocationsharelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_mediapreviewconfiglistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_mediapreviewconfiglistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_notificationsettingsdelegate(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_notificationsettingsdelegate(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_paginationstatuslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_paginationstatuslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_progresswatcher(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_progresswatcher(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_qrloginprogresslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_qrloginprogresslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_recoverystatelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_recoverystatelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomaccountdatalistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomaccountdatalistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomdirectorysearchentrieslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomdirectorysearchentrieslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roominfolistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roominfolistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomlistentrieslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomlistentrieslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomlistloadingstatelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomlistloadingstatelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomlistservicestatelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomlistservicestatelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomlistservicesyncindicatorlistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_roomlistservicesyncindicatorlistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_sendqueuelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_sendqueuelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_sendqueueroomerrorlistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_sendqueueroomerrorlistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_sendqueueroomupdatelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_sendqueueroomupdatelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_sessionverificationcontrollerdelegate(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_sessionverificationcontrollerdelegate(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_spaceroomlistentrieslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_spaceroomlistentrieslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_spaceroomlistpaginationstatelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_spaceroomlistpaginationstatelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_spaceroomlistspacelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_spaceroomlistspacelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_spaceservicejoinedspaceslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_spaceservicejoinedspaceslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_syncnotificationlistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_syncnotificationlistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_syncservicestateobserver(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_syncservicestateobserver(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_timelinelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_timelinelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_typingnotificationslistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_typingnotificationslistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_unabletodecryptdelegate(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_unabletodecryptdelegate(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_verificationstatelistener(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_verificationstatelistener(vtable);
}

/**
 * @param {any} vtable
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_widgetcapabilitiesprovider(vtable) {
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_init_callback_vtable_widgetcapabilitiesprovider(vtable);
}

/**
 * @param {Uint8Array} message
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_content_without_relation_from_message(message, f_status_) {
    const ptr0 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_content_without_relation_from_message(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} caption
 * @param {Uint8Array} formatted_caption
 * @param {Uint8Array} mentions
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_create_caption_edit(caption, formatted_caption, mentions, f_status_) {
    const ptr0 = passArray8ToWasm0(caption, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(formatted_caption, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(mentions, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_create_caption_edit(ptr0, len0, ptr1, len1, ptr2, len2, f_status_.__wbg_ptr);
    var v4 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v4;
}

/**
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_gen_transaction_id(f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_gen_transaction_id(f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {Uint8Array} widget_settings
 * @param {bigint} room
 * @param {Uint8Array} props
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_generate_webview_url(widget_settings, room, props) {
    const ptr0 = passArray8ToWasm0(widget_settings, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(props, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_generate_webview_url(ptr0, len0, room, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} own_user_id
 * @param {Uint8Array} own_device_id
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_get_element_call_required_permissions(own_user_id, own_device_id, f_status_) {
    const ptr0 = passArray8ToWasm0(own_user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(own_device_id, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_get_element_call_required_permissions(ptr0, len0, ptr1, len1, f_status_.__wbg_ptr);
    var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v3;
}

/**
 * @param {Uint8Array} config
 * @param {number} use_lightweight_tokio_runtime
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_init_platform(config, use_lightweight_tokio_runtime, f_status_) {
    const ptr0 = passArray8ToWasm0(config, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_init_platform(ptr0, len0, use_lightweight_tokio_runtime, f_status_.__wbg_ptr);
}

/**
 * @param {Uint8Array} alias
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_is_room_alias_format_valid(alias, f_status_) {
    const ptr0 = passArray8ToWasm0(alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_is_room_alias_format_valid(ptr0, len0, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {Uint8Array} file
 * @param {Uint8Array} line
 * @param {Uint8Array} level
 * @param {Uint8Array} target
 * @param {Uint8Array} message
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_log_event(file, line, level, target, message, f_status_) {
    const ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(line, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(level, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(target, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ptr4 = passArray8ToWasm0(message, wasm.__wbindgen_malloc);
    const len4 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_log_event(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, f_status_.__wbg_ptr);
}

/**
 * @param {Uint8Array} settings
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_make_widget_driver(settings, f_status_) {
    const ptr0 = passArray8ToWasm0(settings, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_make_widget_driver(ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {Uint8Array} room_alias
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_matrix_to_room_alias_permalink(room_alias, f_status_) {
    const ptr0 = passArray8ToWasm0(room_alias, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_matrix_to_room_alias_permalink(ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {Uint8Array} user_id
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_matrix_to_user_permalink(user_id, f_status_) {
    const ptr0 = passArray8ToWasm0(user_id, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_matrix_to_user_permalink(ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {Uint8Array} body
 * @param {Uint8Array} html_body
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_from_html(body, html_body, f_status_) {
    const ptr0 = passArray8ToWasm0(body, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(html_body, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_from_html(ptr0, len0, ptr1, len1, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} body
 * @param {Uint8Array} html_body
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_from_html_as_emote(body, html_body, f_status_) {
    const ptr0 = passArray8ToWasm0(body, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(html_body, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_from_html_as_emote(ptr0, len0, ptr1, len1, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} md
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_from_markdown(md, f_status_) {
    const ptr0 = passArray8ToWasm0(md, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_from_markdown(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} md
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_from_markdown_as_emote(md, f_status_) {
    const ptr0 = passArray8ToWasm0(md, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_from_markdown_as_emote(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} msgtype
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_new(msgtype, f_status_) {
    const ptr0 = passArray8ToWasm0(msgtype, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_message_event_content_new(ptr0, len0, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {Uint8Array} props
 * @param {Uint8Array} config
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_new_virtual_element_call_widget(props, config, f_status_) {
    const ptr0 = passArray8ToWasm0(props, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(config, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_new_virtual_element_call_widget(ptr0, len0, ptr1, len1, f_status_.__wbg_ptr);
    var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v3;
}

/**
 * @param {Uint8Array} uri
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_parse_matrix_entity_from(uri, f_status_) {
    const ptr0 = passArray8ToWasm0(uri, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_parse_matrix_entity_from(ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {Uint8Array} configuration
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_reload_tracing_file_writer(configuration, f_status_) {
    const ptr0 = passArray8ToWasm0(configuration, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_reload_tracing_file_writer(ptr0, len0, f_status_.__wbg_ptr);
}

/**
 * @param {Uint8Array} room_name
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_room_alias_name_from_room_display_name(room_name, f_status_) {
    const ptr0 = passArray8ToWasm0(room_name, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_room_alias_name_from_room_display_name(ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_sdk_git_sha(f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_sdk_git_sha(f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {Uint8Array} role
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_suggested_power_level_for_role(role, f_status_) {
    const ptr0 = passArray8ToWasm0(role, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_suggested_power_level_for_role(ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {Uint8Array} power_level
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_ffi_fn_func_suggested_role_for_power_level(power_level, f_status_) {
    const ptr0 = passArray8ToWasm0(power_level, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_fn_func_suggested_role_for_power_level(ptr0, len0, f_status_.__wbg_ptr);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_u8(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_u8(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_u8(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_u8(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_u8(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_u8(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_u8(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_u8(handle, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_i8(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_i8(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_i8(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_i8(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_i8(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_i8(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_i8(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_i8(handle, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_u16(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_u16(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_u16(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_u16(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_u16(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_u16(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_u16(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_u16(handle, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_i16(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_i16(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_i16(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_i16(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_i16(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_i16(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_i16(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_i16(handle, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_u32(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_u32(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_u32(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_u32(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_u32(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_u32(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_u32(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_u32(handle, f_status_.__wbg_ptr);
    return ret >>> 0;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_i32(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_i32(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_i32(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_i32(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_i32(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_i32(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_i32(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_i32(handle, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_u64(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_u64(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_u64(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_u64(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_u64(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_u64(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_u64(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_u64(handle, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_i64(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_i64(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_i64(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_i64(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_i64(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_i64(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_i64(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_i64(handle, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_f32(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_f32(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_f32(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_f32(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_f32(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_f32(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_f32(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_f32(handle, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_f64(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_f64(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_f64(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_f64(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_f64(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_f64(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_f64(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_f64(handle, f_status_.__wbg_ptr);
    return ret;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_pointer(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_pointer(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_pointer(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_pointer(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_pointer(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_pointer(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_pointer(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_pointer(handle, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_rust_buffer(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_rust_buffer(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_rust_buffer(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_rust_buffer(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_rust_buffer(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_rust_buffer(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_rust_buffer(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_rust_buffer(handle, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @param {bigint} handle
 * @param {any} callback
 * @param {bigint} callback_data
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_poll_void(handle, callback, callback_data) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_poll_void(handle, callback, callback_data);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_void(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_cancel_void(handle);
}

/**
 * @param {bigint} handle
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_free_void(handle) {
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_free_void(handle);
}

/**
 * @param {bigint} handle
 * @param {RustCallStatus} f_status_
 */
export function ubrn_ffi_matrix_sdk_ffi_rust_future_complete_void(handle, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_ffi_matrix_sdk_ffi_rust_future_complete_void(handle, f_status_.__wbg_ptr);
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_content_without_relation_from_message() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_content_without_relation_from_message();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_create_caption_edit() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_create_caption_edit();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_gen_transaction_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_gen_transaction_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_generate_webview_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_generate_webview_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_get_element_call_required_permissions() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_get_element_call_required_permissions();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_init_platform() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_init_platform();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_is_room_alias_format_valid() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_is_room_alias_format_valid();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_log_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_log_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_make_widget_driver() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_make_widget_driver();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_matrix_to_room_alias_permalink() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_matrix_to_room_alias_permalink();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_matrix_to_user_permalink() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_matrix_to_user_permalink();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_from_html() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_from_html();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_from_html_as_emote() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_from_html_as_emote();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_from_markdown() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_from_markdown();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_from_markdown_as_emote() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_from_markdown_as_emote();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_new() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_message_event_content_new();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_new_virtual_element_call_widget() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_new_virtual_element_call_widget();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_parse_matrix_entity_from() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_parse_matrix_entity_from();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_reload_tracing_file_writer() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_reload_tracing_file_writer();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_room_alias_name_from_room_display_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_room_alias_name_from_room_display_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_sdk_git_sha() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_sdk_git_sha();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_suggested_power_level_for_role() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_suggested_power_level_for_role();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_func_suggested_role_for_power_level() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_func_suggested_role_for_power_level();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_checkcodesender_send() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_checkcodesender_send();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_abort_oidc_auth() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_abort_oidc_auth();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_account_data() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_account_data();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_account_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_account_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_available_sliding_sync_versions() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_available_sliding_sync_versions();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_avatar_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_avatar_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_await_room_remote_echo() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_await_room_remote_echo();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_cached_avatar_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_cached_avatar_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_can_deactivate_account() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_can_deactivate_account();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_clear_caches() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_clear_caches();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_create_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_create_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_custom_login_with_jwt() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_custom_login_with_jwt();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_deactivate_account() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_deactivate_account();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_delete_pusher() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_delete_pusher();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_device_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_device_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_display_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_display_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_enable_all_send_queues() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_enable_all_send_queues();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_enable_send_queue_upload_progress() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_enable_send_queue_upload_progress();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_encryption() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_encryption();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_fetch_media_preview_config() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_fetch_media_preview_config();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_dm_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_dm_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_invite_avatars_display_policy() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_invite_avatars_display_policy();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_max_media_upload_size() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_max_media_upload_size();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_media_content() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_media_content();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_media_file() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_media_file();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_media_preview_display_policy() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_media_preview_display_policy();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_media_thumbnail() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_media_thumbnail();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_notification_settings() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_notification_settings();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_profile() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_profile();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_recently_visited_rooms() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_recently_visited_rooms();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_room_preview_from_room_alias() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_room_preview_from_room_alias();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_room_preview_from_room_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_room_preview_from_room_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_session_verification_controller() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_session_verification_controller();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_get_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_homeserver() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_homeserver();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_homeserver_login_details() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_homeserver_login_details();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_ignore_user() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_ignore_user();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_ignored_users() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_ignored_users();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_is_livekit_rtc_supported() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_is_livekit_rtc_supported();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_is_report_room_api_supported() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_is_report_room_api_supported();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_is_room_alias_available() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_is_room_alias_available();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_join_room_by_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_join_room_by_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_join_room_by_id_or_alias() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_join_room_by_id_or_alias();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_knock() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_knock();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_login() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_login();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_login_with_email() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_login_with_email();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_login_with_oidc_callback() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_login_with_oidc_callback();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_logout() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_logout();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_new_grant_login_with_qr_code_handler() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_new_grant_login_with_qr_code_handler();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_new_login_with_qr_code_handler() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_new_login_with_qr_code_handler();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_notification_client() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_notification_client();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_observe_account_data_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_observe_account_data_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_observe_room_account_data_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_observe_room_account_data_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_register_notification_handler() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_register_notification_handler();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_remove_avatar() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_remove_avatar();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_reset_server_info() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_reset_server_info();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_resolve_room_alias() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_resolve_room_alias();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_restore_session() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_restore_session();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_restore_session_with() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_restore_session_with();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_room_alias_exists() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_room_alias_exists();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_room_directory_search() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_room_directory_search();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_rooms() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_rooms();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_search_users() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_search_users();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_server() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_server();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_server_vendor_info() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_server_vendor_info();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_session() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_session();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_account_data() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_account_data();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_delegate() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_delegate();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_display_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_display_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_invite_avatars_display_policy() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_invite_avatars_display_policy();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_media_preview_display_policy() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_media_preview_display_policy();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_media_retention_policy() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_media_retention_policy();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_pusher() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_pusher();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_utd_delegate() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_set_utd_delegate();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_sliding_sync_version() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_sliding_sync_version();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_space_service() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_space_service();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_start_sso_login() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_start_sso_login();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_ignored_users() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_ignored_users();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_media_preview_config() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_media_preview_config();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_room_info() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_room_info();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_send_queue_status() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_send_queue_status();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_send_queue_updates() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_subscribe_to_send_queue_updates();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_sync_service() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_sync_service();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_track_recently_visited_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_track_recently_visited_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_unignore_user() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_unignore_user();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_upload_avatar() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_upload_avatar();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_upload_media() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_upload_media();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_url_for_oidc() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_url_for_oidc();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_user_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_user_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_user_id_server_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_client_user_id_server_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_add_root_certificates() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_add_root_certificates();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_auto_enable_backups() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_auto_enable_backups();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_auto_enable_cross_signing() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_auto_enable_cross_signing();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_backup_download_strategy() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_backup_download_strategy();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_build() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_build();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_cross_process_store_locks_holder_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_cross_process_store_locks_holder_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_decryption_settings() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_decryption_settings();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_disable_automatic_token_refresh() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_disable_automatic_token_refresh();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_disable_built_in_root_certificates() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_disable_built_in_root_certificates();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_disable_ssl_verification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_disable_ssl_verification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_enable_oidc_refresh_lock() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_enable_oidc_refresh_lock();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_enable_share_history_on_invite() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_enable_share_history_on_invite();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_homeserver_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_homeserver_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_in_memory_store() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_in_memory_store();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_indexeddb_store() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_indexeddb_store();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_proxy() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_proxy();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_request_config() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_request_config();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_room_key_recipient_strategy() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_room_key_recipient_strategy();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_server_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_server_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_server_name_or_homeserver_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_server_name_or_homeserver_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_set_session_delegate() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_set_session_delegate();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_sliding_sync_version_builder() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_sliding_sync_version_builder();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_system_is_memory_constrained() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_system_is_memory_constrained();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_threads_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_threads_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_user_agent() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_user_agent();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_username() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientbuilder_username();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_backup_exists_on_server() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_backup_exists_on_server();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_backup_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_backup_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_backup_state_listener() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_backup_state_listener();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_curve25519_key() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_curve25519_key();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_disable_recovery() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_disable_recovery();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_ed25519_key() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_ed25519_key();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_enable_backups() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_enable_backups();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_enable_recovery() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_enable_recovery();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_has_devices_to_verify_against() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_has_devices_to_verify_against();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_is_last_device() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_is_last_device();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_recover() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_recover();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_recover_and_reset() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_recover_and_reset();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_recovery_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_recovery_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_recovery_state_listener() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_recovery_state_listener();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_reset_identity() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_reset_identity();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_reset_recovery_key() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_reset_recovery_key();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_user_identity() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_user_identity();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_verification_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_verification_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_verification_state_listener() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_verification_state_listener();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_wait_for_backup_upload_steady_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_wait_for_backup_upload_steady_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_wait_for_e2ee_initialization_tasks() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_encryption_wait_for_e2ee_initialization_tasks();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_grantloginwithqrcodehandler_generate() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_grantloginwithqrcodehandler_generate();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_grantloginwithqrcodehandler_scan() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_grantloginwithqrcodehandler_scan();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_sliding_sync_version() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_sliding_sync_version();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_supported_oidc_prompts() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_supported_oidc_prompts();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_supports_oidc_login() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_supports_oidc_login();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_supports_password_login() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_supports_password_login();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_supports_sso_login() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_supports_sso_login();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_homeserverlogindetails_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_identityresethandle_auth_type() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_identityresethandle_auth_type();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_identityresethandle_cancel() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_identityresethandle_cancel();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_identityresethandle_reset() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_identityresethandle_reset();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_inreplytodetails_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_inreplytodetails_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_inreplytodetails_event_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_inreplytodetails_event_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_indexeddbstorebuilder_passphrase() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_indexeddbstorebuilder_passphrase();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestactions_accept() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestactions_accept();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestactions_decline() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestactions_decline();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestactions_decline_and_ban() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestactions_decline_and_ban();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestactions_mark_as_seen() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestactions_mark_as_seen();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_lazytimelineitemprovider_contains_only_emojis() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_lazytimelineitemprovider_contains_only_emojis();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_lazytimelineitemprovider_debug_info() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_lazytimelineitemprovider_debug_info();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_lazytimelineitemprovider_get_send_handle() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_lazytimelineitemprovider_get_send_handle();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_lazytimelineitemprovider_get_shields() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_lazytimelineitemprovider_get_shields();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_leavespacehandle_leave() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_leavespacehandle_leave();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_leavespacehandle_rooms() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_leavespacehandle_rooms();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_loginwithqrcodehandler_generate() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_loginwithqrcodehandler_generate();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_loginwithqrcodehandler_scan() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_loginwithqrcodehandler_scan();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediafilehandle_path() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediafilehandle_path();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediafilehandle_persist() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediafilehandle_persist();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediasource_to_json() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediasource_to_json();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediasource_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediasource_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationclient_get_notification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationclient_get_notification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationclient_get_notifications() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationclient_get_notifications();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationclient_get_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationclient_get_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_can_homeserver_push_encrypted_event_to_device() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_can_homeserver_push_encrypted_event_to_device();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_can_push_encrypted_event_to_device() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_can_push_encrypted_event_to_device();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_contains_keywords_rules() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_contains_keywords_rules();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_default_room_notification_mode() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_default_room_notification_mode();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_raw_push_rules() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_raw_push_rules();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_room_notification_settings() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_room_notification_settings();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_rooms_with_user_defined_rules() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_rooms_with_user_defined_rules();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_user_defined_room_notification_mode() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_get_user_defined_room_notification_mode();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_is_call_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_is_call_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_is_invite_for_me_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_is_invite_for_me_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_is_room_mention_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_is_room_mention_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_is_user_mention_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_is_user_mention_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_restore_default_room_notification_mode() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_restore_default_room_notification_mode();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_call_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_call_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_custom_push_rule() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_custom_push_rule();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_default_room_notification_mode() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_default_room_notification_mode();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_delegate() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_delegate();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_invite_for_me_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_invite_for_me_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_room_mention_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_room_mention_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_room_notification_mode() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_room_notification_mode();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_user_mention_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_set_user_mention_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_unmute_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettings_unmute_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_qrcodedata_server_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_qrcodedata_server_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_active_members_count() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_active_members_count();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_active_room_call_participants() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_active_room_call_participants();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_alternative_aliases() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_alternative_aliases();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_apply_power_level_changes() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_apply_power_level_changes();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_avatar_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_avatar_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_ban_user() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_ban_user();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_canonical_alias() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_canonical_alias();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_clear_composer_draft() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_clear_composer_draft();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_clear_event_cache_storage() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_clear_event_cache_storage();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_decline_call() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_decline_call();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_discard_room_key() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_discard_room_key();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_display_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_display_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_edit() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_edit();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_enable_encryption() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_enable_encryption();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_enable_send_queue() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_enable_send_queue();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_encryption_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_encryption_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_fetch_thread_subscription() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_fetch_thread_subscription();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_forget() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_forget();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_get_power_levels() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_get_power_levels();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_get_room_visibility() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_get_room_visibility();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_has_active_room_call() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_has_active_room_call();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_heroes() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_heroes();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_ignore_device_trust_and_resend() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_ignore_device_trust_and_resend();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_ignore_user() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_ignore_user();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_invite_user_by_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_invite_user_by_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_invited_members_count() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_invited_members_count();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_inviter() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_inviter();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_direct() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_direct();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_encrypted() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_encrypted();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_public() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_public();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_send_queue_enabled() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_send_queue_enabled();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_space() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_is_space();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_join() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_join();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_joined_members_count() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_joined_members_count();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_kick_user() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_kick_user();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_latest_encryption_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_latest_encryption_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_latest_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_latest_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_leave() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_leave();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_load_composer_draft() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_load_composer_draft();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_load_or_fetch_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_load_or_fetch_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_mark_as_fully_read_unchecked() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_mark_as_fully_read_unchecked();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_mark_as_read() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_mark_as_read();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_matrix_to_event_permalink() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_matrix_to_event_permalink();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_matrix_to_permalink() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_matrix_to_permalink();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_member() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_member();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_member_avatar_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_member_avatar_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_member_display_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_member_display_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_member_with_sender_info() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_member_with_sender_info();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_members() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_members();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_members_no_sync() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_members_no_sync();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_membership() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_membership();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_new_latest_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_new_latest_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_own_user_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_own_user_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_predecessor_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_predecessor_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_preview_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_preview_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_publish_room_alias_in_room_directory() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_publish_room_alias_in_room_directory();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_raw_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_raw_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_redact() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_redact();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_remove_avatar() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_remove_avatar();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_remove_room_alias_from_room_directory() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_remove_room_alias_from_room_directory();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_report_content() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_report_content();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_report_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_report_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_reset_power_levels() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_reset_power_levels();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_room_events_debug_string() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_room_events_debug_string();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_room_info() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_room_info();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_save_composer_draft() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_save_composer_draft();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_send_live_location() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_send_live_location();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_send_raw() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_send_raw();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_is_favourite() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_is_favourite();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_is_low_priority() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_is_low_priority();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_name() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_name();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_thread_subscription() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_thread_subscription();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_topic() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_topic();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_unread_flag() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_set_unread_flag();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_start_live_location_share() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_start_live_location_share();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_stop_live_location_share() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_stop_live_location_share();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_call_decline_events() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_call_decline_events();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_identity_status_changes() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_identity_status_changes();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_knock_requests() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_knock_requests();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_live_location_shares() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_live_location_shares();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_room_info_updates() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_room_info_updates();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_send_queue_updates() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_send_queue_updates();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_typing_notifications() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_subscribe_to_typing_notifications();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_successor_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_successor_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_suggested_role_for_user() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_suggested_role_for_user();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_timeline() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_timeline();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_timeline_with_configuration() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_timeline_with_configuration();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_topic() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_topic();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_typing_notice() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_typing_notice();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_unban_user() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_unban_user();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_canonical_alias() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_canonical_alias();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_history_visibility() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_history_visibility();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_join_rules() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_join_rules();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_power_levels_for_users() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_power_levels_for_users();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_room_visibility() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_update_room_visibility();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_upload_avatar() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_upload_avatar();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_withdraw_verification_and_resend() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_room_withdraw_verification_and_resend();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_is_at_last_page() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_is_at_last_page();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_loaded_pages() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_loaded_pages();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_next_page() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_next_page();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_results() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_results();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_search() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearch_search();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlist_entries_with_dynamic_adapters() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlist_entries_with_dynamic_adapters();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlist_entries_with_dynamic_adapters_with() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlist_entries_with_dynamic_adapters_with();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlist_loading_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlist_loading_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlist_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlist_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistdynamicentriescontroller_add_one_page() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistdynamicentriescontroller_add_one_page();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistdynamicentriescontroller_reset_to_one_page() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistdynamicentriescontroller_reset_to_one_page();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistdynamicentriescontroller_set_filter() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistdynamicentriescontroller_set_filter();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistentrieswithdynamicadaptersresult_controller() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistentrieswithdynamicadaptersresult_controller();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistentrieswithdynamicadaptersresult_entries_stream() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistentrieswithdynamicadaptersresult_entries_stream();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_all_rooms() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_all_rooms();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_room() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_room();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_subscribe_to_rooms() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_subscribe_to_rooms();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_sync_indicator() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservice_sync_indicator();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roommembersiterator_len() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roommembersiterator_len();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roommembersiterator_next_chunk() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roommembersiterator_next_chunk();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roommessageeventcontentwithoutrelation_with_mentions() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roommessageeventcontentwithoutrelation_with_mentions();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_ban() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_ban();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_invite() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_invite();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_kick() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_kick();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_pin_unpin() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_pin_unpin();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_redact_other() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_redact_other();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_redact_own() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_redact_own();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_send_message() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_send_message();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_send_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_send_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_trigger_room_notification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_own_user_trigger_room_notification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_ban() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_ban();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_invite() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_invite();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_kick() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_kick();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_pin_unpin() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_pin_unpin();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_redact_other() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_redact_other();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_redact_own() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_redact_own();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_send_message() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_send_message();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_send_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_send_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_trigger_room_notification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_can_user_trigger_room_notification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_user_power_levels() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_user_power_levels();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_values() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompowerlevels_values();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_forget() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_forget();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_info() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_info();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_inviter() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_inviter();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_leave() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_leave();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_own_membership_details() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roompreview_own_membership_details();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendattachmentjoinhandle_cancel() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendattachmentjoinhandle_cancel();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendattachmentjoinhandle_join() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendattachmentjoinhandle_join();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendhandle_abort() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendhandle_abort();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendhandle_try_resend() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendhandle_try_resend();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_accept_verification_request() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_accept_verification_request();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_acknowledge_verification_request() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_acknowledge_verification_request();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_approve_verification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_approve_verification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_cancel_verification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_cancel_verification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_decline_verification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_decline_verification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_request_device_verification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_request_device_verification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_request_user_verification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_request_user_verification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_set_delegate() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_set_delegate();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_start_sas_verification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontroller_start_sas_verification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationemoji_description() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationemoji_description();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationemoji_symbol() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationemoji_symbol();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_paginate() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_paginate();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_pagination_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_pagination_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_rooms() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_rooms();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_space() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_space();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_subscribe_to_pagination_state_updates() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_subscribe_to_pagination_state_updates();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_subscribe_to_room_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_subscribe_to_room_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_subscribe_to_space_updates() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlist_subscribe_to_space_updates();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_add_child_to_space() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_add_child_to_space();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_editable_spaces() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_editable_spaces();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_joined_parents_of_child() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_joined_parents_of_child();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_joined_spaces() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_joined_spaces();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_leave_space() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_leave_space();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_remove_child_from_space() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_remove_child_from_space();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_space_room_list() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_space_room_list();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_subscribe_to_joined_spaces() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservice_subscribe_to_joined_spaces();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_span_enter() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_span_enter();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_span_exit() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_span_exit();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_span_is_none() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_span_is_none();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_ssohandler_finish() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_ssohandler_finish();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_ssohandler_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_ssohandler_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_expire_sessions() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_expire_sessions();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_room_list_service() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_room_list_service();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_start() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_start();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_state() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_state();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_stop() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservice_stop();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicebuilder_finish() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicebuilder_finish();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicebuilder_with_cross_process_lock() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicebuilder_with_cross_process_lock();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicebuilder_with_offline_mode() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicebuilder_with_offline_mode();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicebuilder_with_share_pos() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicebuilder_with_share_pos();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_taskhandle_cancel() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_taskhandle_cancel();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_taskhandle_is_finished() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_taskhandle_is_finished();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_threadsummary_latest_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_threadsummary_latest_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_threadsummary_num_replies() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_threadsummary_num_replies();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_add_listener() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_add_listener();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_create_message_content() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_create_message_content();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_create_poll() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_create_poll();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_edit() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_edit();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_end_poll() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_end_poll();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_fetch_details_for_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_fetch_details_for_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_fetch_members() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_fetch_members();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_get_event_timeline_item_by_event_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_get_event_timeline_item_by_event_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_latest_event_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_latest_event_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_load_reply_details() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_load_reply_details();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_mark_as_read() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_mark_as_read();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_paginate_backwards() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_paginate_backwards();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_paginate_forwards() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_paginate_forwards();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_pin_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_pin_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_redact_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_redact_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_retry_decryption() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_retry_decryption();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_audio() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_audio();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_file() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_file();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_image() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_image();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_location() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_location();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_poll_response() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_poll_response();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_read_receipt() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_read_receipt();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_reply() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_reply();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_video() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_video();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_voice_message() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_send_voice_message();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_subscribe_to_back_pagination_status() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_subscribe_to_back_pagination_status();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_toggle_reaction() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_toggle_reaction();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_unpin_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timeline_unpin_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_event_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_event_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_event_type() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_event_type();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_sender_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_sender_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_thread_root_event_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_thread_root_event_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_timestamp() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineevent_timestamp();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineitem_as_event() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineitem_as_event();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineitem_as_virtual() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineitem_as_virtual();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineitem_fmt_debug() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineitem_fmt_debug();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineitem_unique_id() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelineitem_unique_id();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_unreadnotificationscount_has_notifications() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_unreadnotificationscount_has_notifications();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_unreadnotificationscount_highlight_count() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_unreadnotificationscount_highlight_count();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_unreadnotificationscount_notification_count() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_unreadnotificationscount_notification_count();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_has_verification_violation() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_has_verification_violation();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_is_verified() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_is_verified();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_master_key() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_master_key();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_pin() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_pin();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_was_previously_verified() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_was_previously_verified();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_withdraw_verification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_useridentity_withdraw_verification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_widgetdriver_run() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_widgetdriver_run();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_widgetdriverhandle_recv() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_widgetdriverhandle_recv();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_widgetdriverhandle_send() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_widgetdriverhandle_send();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_clientbuilder_new() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_clientbuilder_new();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_indexeddbstorebuilder_new() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_indexeddbstorebuilder_new();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_mediasource_from_json() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_mediasource_from_json();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_mediasource_from_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_mediasource_from_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_qrcodedata_from_bytes() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_qrcodedata_from_bytes();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_span_current() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_span_current();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_span_new() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_span_new();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_span_new_bridge_span() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_span_new_bridge_span();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_timelineeventtypefilter_exclude() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_timelineeventtypefilter_exclude();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_timelineeventtypefilter_include() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_constructor_timelineeventtypefilter_include();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_accountdatalistener_on_change() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_accountdatalistener_on_change();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_backupstatelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_backupstatelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_backupsteadystatelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_backupsteadystatelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_calldeclinelistener_call() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_calldeclinelistener_call();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientdelegate_did_receive_auth_error() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientdelegate_did_receive_auth_error();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientsessiondelegate_retrieve_session_from_keychain() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientsessiondelegate_retrieve_session_from_keychain();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientsessiondelegate_save_session_in_keychain() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_clientsessiondelegate_save_session_in_keychain();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_enablerecoveryprogresslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_enablerecoveryprogresslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_generatedqrloginprogresslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_generatedqrloginprogresslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_grantgeneratedqrloginprogresslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_grantgeneratedqrloginprogresslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_grantqrloginprogresslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_grantqrloginprogresslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_identitystatuschangelistener_call() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_identitystatuschangelistener_call();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_ignoreduserslistener_call() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_ignoreduserslistener_call();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestslistener_call() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_knockrequestslistener_call();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_livelocationsharelistener_call() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_livelocationsharelistener_call();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediapreviewconfiglistener_on_change() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_mediapreviewconfiglistener_on_change();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettingsdelegate_settings_did_change() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_notificationsettingsdelegate_settings_did_change();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_paginationstatuslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_paginationstatuslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_progresswatcher_transmission_progress() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_progresswatcher_transmission_progress();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_qrloginprogresslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_qrloginprogresslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_recoverystatelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_recoverystatelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomaccountdatalistener_on_change() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomaccountdatalistener_on_change();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearchentrieslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomdirectorysearchentrieslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roominfolistener_call() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roominfolistener_call();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistentrieslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistentrieslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistloadingstatelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistloadingstatelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservicestatelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservicestatelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservicesyncindicatorlistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_roomlistservicesyncindicatorlistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendqueuelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendqueuelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendqueueroomerrorlistener_on_error() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendqueueroomerrorlistener_on_error();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendqueueroomupdatelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sendqueueroomupdatelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_receive_verification_request() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_receive_verification_request();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_accept_verification_request() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_accept_verification_request();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_start_sas_verification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_start_sas_verification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_receive_verification_data() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_receive_verification_data();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_fail() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_fail();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_cancel() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_cancel();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_finish() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_sessionverificationcontrollerdelegate_did_finish();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlistentrieslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlistentrieslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlistpaginationstatelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlistpaginationstatelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlistspacelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceroomlistspacelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservicejoinedspaceslistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_spaceservicejoinedspaceslistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncnotificationlistener_on_notification() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncnotificationlistener_on_notification();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicestateobserver_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_syncservicestateobserver_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelinelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_timelinelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_typingnotificationslistener_call() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_typingnotificationslistener_call();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_unabletodecryptdelegate_on_utd() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_unabletodecryptdelegate_on_utd();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_verificationstatelistener_on_update() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_verificationstatelistener_on_update();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_ffi_checksum_method_widgetcapabilitiesprovider_acquire_capabilities() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_ffi_checksum_method_widgetcapabilitiesprovider_acquire_capabilities();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ffi_uniffi_contract_version() {
    const ret = wasm.ubrn_ffi_matrix_sdk_ffi_uniffi_contract_version();
    return ret >>> 0;
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {bigint}
 */
export function ubrn_uniffi_matrix_sdk_fn_clone_oauthauthorizationdata(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_fn_clone_oauthauthorizationdata(ptr, f_status_.__wbg_ptr);
    return BigInt.asUintN(64, ret);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 */
export function ubrn_uniffi_matrix_sdk_fn_free_oauthauthorizationdata(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    wasm.ubrn_uniffi_matrix_sdk_fn_free_oauthauthorizationdata(ptr, f_status_.__wbg_ptr);
}

/**
 * @param {bigint} ptr
 * @param {RustCallStatus} f_status_
 * @returns {Uint8Array}
 */
export function ubrn_uniffi_matrix_sdk_fn_method_oauthauthorizationdata_login_url(ptr, f_status_) {
    _assertClass(f_status_, RustCallStatus);
    const ret = wasm.ubrn_uniffi_matrix_sdk_fn_method_oauthauthorizationdata_login_url(ptr, f_status_.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * @returns {number}
 */
export function ubrn_uniffi_matrix_sdk_checksum_method_oauthauthorizationdata_login_url() {
    const ret = wasm.ubrn_uniffi_matrix_sdk_checksum_method_oauthauthorizationdata_login_url();
    return ret;
}

/**
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_uniffi_contract_version() {
    const ret = wasm.ubrn_ffi_matrix_sdk_uniffi_contract_version();
    return ret >>> 0;
}

/**
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_base_uniffi_contract_version() {
    const ret = wasm.ubrn_ffi_matrix_sdk_base_uniffi_contract_version();
    return ret >>> 0;
}

/**
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_common_uniffi_contract_version() {
    const ret = wasm.ubrn_ffi_matrix_sdk_common_uniffi_contract_version();
    return ret >>> 0;
}

/**
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_crypto_uniffi_contract_version() {
    const ret = wasm.ubrn_ffi_matrix_sdk_crypto_uniffi_contract_version();
    return ret >>> 0;
}

/**
 * @returns {number}
 */
export function ubrn_ffi_matrix_sdk_ui_uniffi_contract_version() {
    const ret = wasm.ubrn_ffi_matrix_sdk_ui_uniffi_contract_version();
    return ret >>> 0;
}

function wasm_bindgen__convert__closures_____invoke__h1fe746909eefbd44(arg0, arg1) {
    wasm.wasm_bindgen__convert__closures_____invoke__h1fe746909eefbd44(arg0, arg1);
}

function wasm_bindgen__convert__closures_____invoke__h8a7dd692e8d2212a(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h8a7dd692e8d2212a(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__ha24c9e313954a856(arg0, arg1) {
    wasm.wasm_bindgen__convert__closures_____invoke__ha24c9e313954a856(arg0, arg1);
}

function wasm_bindgen__convert__closures_____invoke__h55e17fb981617ceb(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures_____invoke__h55e17fb981617ceb(arg0, arg1, arg2);
}

function wasm_bindgen__convert__closures_____invoke__h6b53e77f7a4c6c68(arg0, arg1) {
    wasm.wasm_bindgen__convert__closures_____invoke__h6b53e77f7a4c6c68(arg0, arg1);
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
function wasm_bindgen__convert__closures_____invoke__h8ec0c23431aa9068(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen__convert__closures_____invoke__h8ec0c23431aa9068(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * A machine-readable representation of the authenticity for a `ShieldState`.
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6}
 */
export const ShieldStateCode = Object.freeze({
    /**
     * Not enough information available to check the authenticity.
     */
    AuthenticityNotGuaranteed: 0, "0": "AuthenticityNotGuaranteed",
    /**
     * The sending device isn't yet known by the Client.
     */
    UnknownDevice: 1, "1": "UnknownDevice",
    /**
     * The sending device hasn't been verified by the sender.
     */
    UnsignedDevice: 2, "2": "UnsignedDevice",
    /**
     * The sender hasn't been verified by the Client's user.
     */
    UnverifiedIdentity: 3, "3": "UnverifiedIdentity",
    /**
     * An unencrypted event in an encrypted room.
     */
    SentInClear: 4, "4": "SentInClear",
    /**
     * The sender was previously verified but changed their identity.
     */
    VerificationViolation: 5, "5": "VerificationViolation",
    /**
     * The `sender` field on the event does not match the owner of the device
     * that established the Megolm session.
     */
    MismatchedSender: 6, "6": "MismatchedSender",
});

const __wbindgen_enum_IdbRequestReadyState = ["pending", "done"];

const __wbindgen_enum_IdbTransactionMode = ["readonly", "readwrite", "versionchange", "readwriteflush", "cleanup"];

const __wbindgen_enum_RequestCache = ["default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached"];

const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];

const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];

const RustCallStatusFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rustcallstatus_free(ptr >>> 0, 1));

export class RustCallStatus {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RustCallStatusFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rustcallstatus_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get code() {
        const ret = wasm.__wbg_get_rustcallstatus_code(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set code(arg0) {
        wasm.__wbg_set_rustcallstatus_code(this.__wbg_ptr, arg0);
    }
    constructor() {
        const ret = wasm.rustcallstatus_new();
        this.__wbg_ptr = ret >>> 0;
        RustCallStatusFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {Uint8Array | undefined}
     */
    get errorBuf() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.rustcallstatus_error_buf(ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {Uint8Array | null} [bytes]
     */
    set errorBuf(bytes) {
        var ptr0 = isLikeNone(bytes) ? 0 : passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.rustcallstatus_set_error_buf(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) RustCallStatus.prototype[Symbol.dispose] = RustCallStatus.prototype.free;

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_Error_e83987f665cf5504 = function(arg0, arg1) {
        const ret = Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_Number_bb48ca12f395cd08 = function(arg0) {
        const ret = Number(arg0);
        return ret;
    };
    imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function(arg0, arg1) {
        const ret = String(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_Window_41559019033ede94 = function(arg0) {
        const ret = arg0.Window;
        return ret;
    };
    imports.wbg.__wbg_WorkerGlobalScope_d324bffbeaef9f3a = function(arg0) {
        const ret = arg0.WorkerGlobalScope;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_bigint_get_as_i64_f3ebc5a755000afd = function(arg0, arg1) {
        const v = arg1;
        const ret = typeof(v) === 'bigint' ? v : undefined;
        getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbg___wbindgen_boolean_get_6d5a1ee65bab5f68 = function(arg0) {
        const v = arg0;
        const ret = typeof(v) === 'boolean' ? v : undefined;
        return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
    };
    imports.wbg.__wbg___wbindgen_debug_string_df47ffb5e35e6763 = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_in_bb933bd9e1b3bc0f = function(arg0, arg1) {
        const ret = arg0 in arg1;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_bigint_cb320707dcd35f0b = function(arg0) {
        const ret = typeof(arg0) === 'bigint';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_function_ee8a6c5833c90377 = function(arg0) {
        const ret = typeof(arg0) === 'function';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_null_5e69f72e906cc57c = function(arg0) {
        const ret = arg0 === null;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_object_c818261d21f283a4 = function(arg0) {
        const val = arg0;
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_string_fbb76cb2940daafd = function(arg0) {
        const ret = typeof(arg0) === 'string';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_undefined_2d472862bd29a478 = function(arg0) {
        const ret = arg0 === undefined;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_jsval_eq_6b13ab83478b1c50 = function(arg0, arg1) {
        const ret = arg0 === arg1;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_jsval_loose_eq_b664b38a2f582147 = function(arg0, arg1) {
        const ret = arg0 == arg1;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_number_get_a20bf9b85341449d = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbg___wbindgen_string_get_e4f06c90489ad01b = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_throw_b855445ff6a94295 = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg__wbg_cb_unref_2454a539ea5790d9 = function(arg0) {
        arg0._wbg_cb_unref();
    };
    imports.wbg.__wbg_abort_28ad55c5825b004d = function(arg0, arg1) {
        arg0.abort(arg1);
    };
    imports.wbg.__wbg_abort_3b256cd5ad0ac232 = function() { return handleError(function (arg0) {
        arg0.abort();
    }, arguments) };
    imports.wbg.__wbg_abort_e7eb059f72f9ed0c = function(arg0) {
        arg0.abort();
    };
    imports.wbg.__wbg_acquireCapabilities_4954b226b8545b75 = function(arg0) {
        const ret = arg0.acquireCapabilities;
        return ret;
    };
    imports.wbg.__wbg_add_09c702e72be40c03 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.add(arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_append_b577eb3a177bc0fa = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        arg0.append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_arrayBuffer_b375eccb84b4ddf3 = function() { return handleError(function (arg0) {
        const ret = arg0.arrayBuffer();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_bound_7b891dbfb3be3593 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = IDBKeyRange.bound(arg0, arg1, arg2 !== 0, arg3 !== 0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_call_00d7cbf09c2e940b = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_05f066187fc6de9f = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_096cd040e09ba9a0 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        var v1 = getArrayU8FromWasm0(arg5, arg6).slice();
        wasm.__wbindgen_free(arg5, arg6 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0, v1);
        return ret;
    };
    imports.wbg.__wbg_call_0e2b14bf0b0cd95f = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_1d533809d699c988 = function(arg0, arg1, arg2) {
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2));
        return ret;
    };
    imports.wbg.__wbg_call_24f4e12430fc6068 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_27384e40e0c774d4 = function(arg0, arg1, arg2, arg3) {
        arg0.call(arg1, BigInt.asUintN(64, arg2), arg3);
    };
    imports.wbg.__wbg_call_30efcd3749c6f20b = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_37dc9b08f6e2c808 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_3970e7112dc9d896 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_39a3f59769848c89 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_3d6775529e0a3bc8 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_451f1a1eb372fbc8 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_459d911653a253be = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_483dad2dbe9cc59b = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_4a27ed15190d6181 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_525440f72fbfc0ea = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.call(arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_call_5d8afe73b5868196 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        var v1 = getArrayU8FromWasm0(arg5, arg6).slice();
        wasm.__wbindgen_free(arg5, arg6 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0, v1);
        return ret;
    };
    imports.wbg.__wbg_call_6398f8f2bb33d834 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_7b102e1715d00d0e = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_7e10e4d0efddc02a = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_7f5ea8a2cf6c1616 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_7fbcbe7a2c80abf7 = function(arg0, arg1, arg2, arg3) {
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), arg3);
        return ret;
    };
    imports.wbg.__wbg_call_833232f5bc537e82 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_a965ea288fa4d55e = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_ab1259c6390ed2b5 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        var v1 = getArrayU8FromWasm0(arg5, arg6).slice();
        wasm.__wbindgen_free(arg5, arg6 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0, v1);
        return ret;
    };
    imports.wbg.__wbg_call_ac90d49c774adc4f = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_aef89332e13affc7 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_b12ad983dc41ccee = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_b19b94fc5a4d6559 = function(arg0) {
        const ret = arg0.call;
        return ret;
    };
    imports.wbg.__wbg_call_d76c31ea7d1dab6e = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_daf967e4df607139 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_e41778c00328eadf = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        var v1 = getArrayU8FromWasm0(arg5, arg6).slice();
        wasm.__wbindgen_free(arg5, arg6 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0, v1);
        return ret;
    };
    imports.wbg.__wbg_call_e762c39fa8ea36bf = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.call(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_call_e7ca926262c25947 = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_ed0ea4f59022e6ed = function(arg0, arg1, arg2, arg3, arg4) {
        var v0 = getArrayU8FromWasm0(arg3, arg4).slice();
        wasm.__wbindgen_free(arg3, arg4 * 1, 1);
        const ret = arg0.call(arg1, BigInt.asUintN(64, arg2), v0);
        return ret;
    };
    imports.wbg.__wbg_call_f48f841b923b9830 = function(arg0, arg1, arg2) {
        arg0.call(arg1, BigInt.asUintN(64, arg2));
    };
    imports.wbg.__wbg_clearTimeout_5a54f8841c30079a = function(arg0) {
        const ret = clearTimeout(arg0);
        return ret;
    };
    imports.wbg.__wbg_clearTimeout_7a42b49784aea641 = function(arg0) {
        const ret = clearTimeout(arg0);
        return ret;
    };
    imports.wbg.__wbg_clear_9214baf36e6f1771 = function() { return handleError(function (arg0) {
        const ret = arg0.clear();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_close_74386af11ef5ae35 = function(arg0) {
        arg0.close();
    };
    imports.wbg.__wbg_code_218f5fdf8c7fcabd = function(arg0) {
        const ret = arg0.code;
        return ret;
    };
    imports.wbg.__wbg_code_b4177582d95904f8 = function(arg0) {
        const ret = arg0.code;
        return ret;
    };
    imports.wbg.__wbg_code_ea007b857f96560b = function(arg0) {
        const ret = arg0.code;
        return ret;
    };
    imports.wbg.__wbg_commit_a54edce65f3858f2 = function() { return handleError(function (arg0) {
        arg0.commit();
    }, arguments) };
    imports.wbg.__wbg_continue_a31229352363abe4 = function() { return handleError(function (arg0) {
        arg0.continue();
    }, arguments) };
    imports.wbg.__wbg_count_490455f0b0267dfd = function() { return handleError(function (arg0) {
        const ret = arg0.count();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_count_cb03fc4874348eed = function() { return handleError(function (arg0) {
        const ret = arg0.count();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createIndex_80b227ebee437462 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = arg0.createIndex(getStringFromWasm0(arg1, arg2), arg3);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createIndex_bf0bba749e8ae929 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        const ret = arg0.createIndex(getStringFromWasm0(arg1, arg2), arg3, arg4);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createObjectStore_7df0fb1da746f44d = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.createObjectStore(getStringFromWasm0(arg1, arg2));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_crypto_ed58b8e10a292839 = function(arg0) {
        const ret = arg0.crypto;
        return ret;
    };
    imports.wbg.__wbg_deleteObjectStore_444a266b213fafcf = function() { return handleError(function (arg0, arg1, arg2) {
        arg0.deleteObjectStore(getStringFromWasm0(arg1, arg2));
    }, arguments) };
    imports.wbg.__wbg_delete_eda273f9efee8e09 = function() { return handleError(function (arg0) {
        const ret = arg0.delete();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_delete_f808c4661e8e34c0 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.delete(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_didAcceptVerificationRequest_5d8d80ce6d7be9b7 = function(arg0) {
        const ret = arg0.didAcceptVerificationRequest;
        return ret;
    };
    imports.wbg.__wbg_didCancel_6db5bb227bbc75b7 = function(arg0) {
        const ret = arg0.didCancel;
        return ret;
    };
    imports.wbg.__wbg_didFail_facfc4494789ab4b = function(arg0) {
        const ret = arg0.didFail;
        return ret;
    };
    imports.wbg.__wbg_didFinish_add0d51dea02ab76 = function(arg0) {
        const ret = arg0.didFinish;
        return ret;
    };
    imports.wbg.__wbg_didReceiveAuthError_0b5ba2b69bcfced1 = function(arg0) {
        const ret = arg0.didReceiveAuthError;
        return ret;
    };
    imports.wbg.__wbg_didReceiveVerificationData_7d9bb7a9b9d47734 = function(arg0) {
        const ret = arg0.didReceiveVerificationData;
        return ret;
    };
    imports.wbg.__wbg_didReceiveVerificationRequest_74a2fe67abe2e31c = function(arg0) {
        const ret = arg0.didReceiveVerificationRequest;
        return ret;
    };
    imports.wbg.__wbg_didStartSasVerification_4cd3b90dc59d2976 = function(arg0) {
        const ret = arg0.didStartSasVerification;
        return ret;
    };
    imports.wbg.__wbg_done_2042aa2670fb1db1 = function(arg0) {
        const ret = arg0.done;
        return ret;
    };
    imports.wbg.__wbg_entries_e171b586f8f6bdbf = function(arg0) {
        const ret = Object.entries(arg0);
        return ret;
    };
    imports.wbg.__wbg_error_3e929987fcd3e155 = function() { return handleError(function (arg0) {
        const ret = arg0.error;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments) };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_error_buf_1101076ebe43f3e2 = function(arg0, arg1) {
        const ret = arg1.errorBuf;
        var ptr1 = isLikeNone(ret) ? 0 : passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_error_buf_c08f558fde2921eb = function(arg0, arg1) {
        const ret = arg1.errorBuf;
        var ptr1 = isLikeNone(ret) ? 0 : passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_fetch_74a3e84ebd2c9a0e = function(arg0) {
        const ret = fetch(arg0);
        return ret;
    };
    imports.wbg.__wbg_fetch_f8ba0e29a9d6de0d = function(arg0, arg1) {
        const ret = arg0.fetch(arg1);
        return ret;
    };
    imports.wbg.__wbg_getAllKeys_33842a9ff138a7b2 = function() { return handleError(function (arg0) {
        const ret = arg0.getAllKeys();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getAllKeys_982f32ccbec04575 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.getAllKeys(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getAll_0499a740f140f40d = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.getAll(arg1, arg2 >>> 0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getAll_38347e0eb50cf7a2 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.getAll(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getAll_61db2690ef34ac0e = function() { return handleError(function (arg0) {
        const ret = arg0.getAll();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getAll_9121ade297db31db = function() { return handleError(function (arg0) {
        const ret = arg0.getAll();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getRandomValues_38a1ff1ea09f6cc7 = function() { return handleError(function (arg0, arg1) {
        globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
    }, arguments) };
    imports.wbg.__wbg_getRandomValues_bcb4912f16000dc4 = function() { return handleError(function (arg0, arg1) {
        arg0.getRandomValues(arg1);
    }, arguments) };
    imports.wbg.__wbg_getTime_14776bfb48a1bff9 = function(arg0) {
        const ret = arg0.getTime();
        return ret;
    };
    imports.wbg.__wbg_getTimezoneOffset_d391cb11d54969f8 = function(arg0) {
        const ret = arg0.getTimezoneOffset();
        return ret;
    };
    imports.wbg.__wbg_get_35a96bee4edfba3b = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.get(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_get_7bed016f185add81 = function(arg0, arg1) {
        const ret = arg0[arg1 >>> 0];
        return ret;
    };
    imports.wbg.__wbg_get_efcb449f58ec27c2 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(arg0, arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_get_fb1fa70beb44a754 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.get(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_get_with_ref_key_1dc361bd10053bfe = function(arg0, arg1) {
        const ret = arg0[arg1];
        return ret;
    };
    imports.wbg.__wbg_global_f5c2926e57ba457f = function(arg0) {
        const ret = arg0.global;
        return ret;
    };
    imports.wbg.__wbg_has_787fafc980c3ccdb = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.has(arg0, arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_headers_b87d7eaba61c3278 = function(arg0) {
        const ret = arg0.headers;
        return ret;
    };
    imports.wbg.__wbg_index_ed05511cfa2e8920 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.index(getStringFromWasm0(arg1, arg2));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_indexedDB_54f01430b1e194e8 = function() { return handleError(function (arg0) {
        const ret = arg0.indexedDB;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments) };
    imports.wbg.__wbg_indexedDB_62bfbbd55ec74b14 = function() { return handleError(function (arg0) {
        const ret = arg0.indexedDB;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments) };
    imports.wbg.__wbg_indexedDB_8b464318fe56681e = function() { return handleError(function (arg0) {
        const ret = arg0.indexedDB;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments) };
    imports.wbg.__wbg_instanceof_ArrayBuffer_70beb1189ca63b38 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_CursorSys_4b6a8aba0e823e75 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof IDBCursorWithValue;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_DomException_83b15e7b042a0b1a = function(arg0) {
        let result;
        try {
            result = arg0 instanceof DOMException;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Error_a944ec10920129e2 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof Error;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_IdbCursor_4561d703bce4eb15 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof IDBCursor;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_IdbDatabase_fcf75ffeeec3ec8c = function(arg0) {
        let result;
        try {
            result = arg0 instanceof IDBDatabase;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_IdbOpenDbRequest_08e4929084e51476 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof IDBOpenDBRequest;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_IdbRequest_26754883a3cc8f81 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof IDBRequest;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Map_8579b5e2ab5437c7 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof Map;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Response_f4f3e87e07f3135c = function(arg0) {
        let result;
        try {
            result = arg0 instanceof Response;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Uint8Array_20c8e73002f7af98 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_isArray_643fafc484312e19 = function(arg0) {
        const ret = Array.isArray(arg0);
        return ret;
    };
    imports.wbg.__wbg_isArray_96e0af9891d0945d = function(arg0) {
        const ret = Array.isArray(arg0);
        return ret;
    };
    imports.wbg.__wbg_isSafeInteger_d216eda7911dde36 = function(arg0) {
        const ret = Number.isSafeInteger(arg0);
        return ret;
    };
    imports.wbg.__wbg_item_2581d997ac1f0082 = function(arg0, arg1, arg2) {
        const ret = arg1.item(arg2 >>> 0);
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_iterator_e5822695327a3c39 = function() {
        const ret = Symbol.iterator;
        return ret;
    };
    imports.wbg.__wbg_key_d84f6472d959b974 = function() { return handleError(function (arg0) {
        const ret = arg0.key;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_length_69bca3cb64fc8748 = function(arg0) {
        const ret = arg0.length;
        return ret;
    };
    imports.wbg.__wbg_length_cdd215e10d9dd507 = function(arg0) {
        const ret = arg0.length;
        return ret;
    };
    imports.wbg.__wbg_lowerBound_738117f2d23f503a = function() { return handleError(function (arg0, arg1) {
        const ret = IDBKeyRange.lowerBound(arg0, arg1 !== 0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_message_1ee258909d7264fd = function(arg0) {
        const ret = arg0.message;
        return ret;
    };
    imports.wbg.__wbg_message_bd42dbe3f2f3ed8e = function(arg0, arg1) {
        const ret = arg1.message;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_msCrypto_0a36e2ec3a343d26 = function(arg0) {
        const ret = arg0.msCrypto;
        return ret;
    };
    imports.wbg.__wbg_name_012808ba1253a92d = function(arg0, arg1) {
        const ret = arg1.name;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_name_3a33ad25b892b2dd = function(arg0, arg1) {
        const ret = arg1.name;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_new_0_f9740686d739025c = function() {
        const ret = new Date();
        return ret;
    };
    imports.wbg.__wbg_new_1acc0b6eea89d040 = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_2531773dac38ebb3 = function() { return handleError(function () {
        const ret = new AbortController();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_5a79be3ab53b8aa5 = function(arg0) {
        const ret = new Uint8Array(arg0);
        return ret;
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_new_93d9417ed3fb115d = function(arg0) {
        const ret = new Date(arg0);
        return ret;
    };
    imports.wbg.__wbg_new_9edf9838a2def39c = function() { return handleError(function () {
        const ret = new Headers();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_a7442b4b19c1a356 = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_e17d9f43105b08be = function() {
        const ret = new Array();
        return ret;
    };
    imports.wbg.__wbg_new_from_slice_92f4d78ca282a2d2 = function(arg0, arg1) {
        const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_no_args_ee98eee5275000a4 = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_with_length_01aa0dc35aa13543 = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return ret;
    };
    imports.wbg.__wbg_new_with_str_and_init_0ae7728b6ec367b1 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_next_020810e0ae8ebcb0 = function() { return handleError(function (arg0) {
        const ret = arg0.next();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_next_2c826fe5dfec6b6a = function(arg0) {
        const ret = arg0.next;
        return ret;
    };
    imports.wbg.__wbg_node_02999533c4ea02e3 = function(arg0) {
        const ret = arg0.node;
        return ret;
    };
    imports.wbg.__wbg_now_2c95c9de01293173 = function(arg0) {
        const ret = arg0.now();
        return ret;
    };
    imports.wbg.__wbg_now_793306c526e2e3b6 = function() {
        const ret = Date.now();
        return ret;
    };
    imports.wbg.__wbg_objectStoreNames_cfcd75f76eff34e4 = function(arg0) {
        const ret = arg0.objectStoreNames;
        return ret;
    };
    imports.wbg.__wbg_objectStore_2aab1d8b165c62a6 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.objectStore(getStringFromWasm0(arg1, arg2));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_oldVersion_54e2e7cdf22e05ff = function(arg0) {
        const ret = arg0.oldVersion;
        return ret;
    };
    imports.wbg.__wbg_onChange_de1db68bdfb5fed9 = function(arg0) {
        const ret = arg0.onChange;
        return ret;
    };
    imports.wbg.__wbg_onError_2a59e00e01d3867d = function(arg0) {
        const ret = arg0.onError;
        return ret;
    };
    imports.wbg.__wbg_onNotification_2d64070d9bc04a45 = function(arg0) {
        const ret = arg0.onNotification;
        return ret;
    };
    imports.wbg.__wbg_onUpdate_2951452f3e9280ef = function(arg0) {
        const ret = arg0.onUpdate;
        return ret;
    };
    imports.wbg.__wbg_onUtd_c7593e4cae57dfaf = function(arg0) {
        const ret = arg0.onUtd;
        return ret;
    };
    imports.wbg.__wbg_openCursor_997b9df63352dd78 = function() { return handleError(function (arg0) {
        const ret = arg0.openCursor();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_openCursor_b3877357f6b94bf5 = function() { return handleError(function (arg0) {
        const ret = arg0.openCursor();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_openCursor_da22e71977afb7d7 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.openCursor(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_open_2653511fbee48295 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = arg0.open(getStringFromWasm0(arg1, arg2), arg3);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_open_9d8c51d122a5a6ea = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = arg0.open(getStringFromWasm0(arg1, arg2), arg3 >>> 0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_open_a36354e60d7255fb = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.open(getStringFromWasm0(arg1, arg2));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_parse_2a704d6b78abb2b8 = function() { return handleError(function (arg0, arg1) {
        const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_performance_7a3ffd0b17f663ad = function(arg0) {
        const ret = arg0.performance;
        return ret;
    };
    imports.wbg.__wbg_pointee_350ad57f547d0a2b = function(arg0, arg1) {
        const ret = arg1.pointee;
        var ptr1 = isLikeNone(ret) ? 0 : passArray8ToWasm0(ret, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_process_5c1d670bc53614b8 = function(arg0) {
        const ret = arg0.process;
        return ret;
    };
    imports.wbg.__wbg_prototypesetcall_2a6620b6922694b2 = function(arg0, arg1, arg2) {
        Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
    };
    imports.wbg.__wbg_push_df81a39d04db858c = function(arg0, arg1) {
        const ret = arg0.push(arg1);
        return ret;
    };
    imports.wbg.__wbg_put_88678dd575c85637 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.put(arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_queueMicrotask_34d692c25c47d05b = function(arg0) {
        const ret = arg0.queueMicrotask;
        return ret;
    };
    imports.wbg.__wbg_queueMicrotask_9d76cacb20c84d58 = function(arg0) {
        queueMicrotask(arg0);
    };
    imports.wbg.__wbg_randomFillSync_ab2cfe79ebbf2740 = function() { return handleError(function (arg0, arg1) {
        arg0.randomFillSync(arg1);
    }, arguments) };
    imports.wbg.__wbg_readyState_51d79bf8ebb8a05c = function(arg0) {
        const ret = arg0.readyState;
        return (__wbindgen_enum_IdbRequestReadyState.indexOf(ret) + 1 || 3) - 1;
    };
    imports.wbg.__wbg_request_5079471e06223120 = function(arg0) {
        const ret = arg0.request;
        return ret;
    };
    imports.wbg.__wbg_request_fada8c23b78b3a02 = function(arg0) {
        const ret = arg0.request;
        return ret;
    };
    imports.wbg.__wbg_require_79b1e9274cde3c87 = function() { return handleError(function () {
        const ret = module.require;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_resolve_caf97c30b83f7053 = function(arg0) {
        const ret = Promise.resolve(arg0);
        return ret;
    };
    imports.wbg.__wbg_result_25e75004b82b9830 = function() { return handleError(function (arg0) {
        const ret = arg0.result;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_retrieveSessionFromKeychain_7e183f129cccc6ed = function(arg0) {
        const ret = arg0.retrieveSessionFromKeychain;
        return ret;
    };
    imports.wbg.__wbg_saveSessionInKeychain_00fb13625ee77b8f = function(arg0) {
        const ret = arg0.saveSessionInKeychain;
        return ret;
    };
    imports.wbg.__wbg_setTimeout_7bb3429662ab1e70 = function(arg0, arg1) {
        const ret = setTimeout(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbg_setTimeout_db2dbaeefb6f39c7 = function() { return handleError(function (arg0, arg1) {
        const ret = setTimeout(arg0, arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    };
    imports.wbg.__wbg_set_body_3c365989753d61f4 = function(arg0, arg1) {
        arg0.body = arg1;
    };
    imports.wbg.__wbg_set_c213c871859d6500 = function(arg0, arg1, arg2) {
        arg0[arg1 >>> 0] = arg2;
    };
    imports.wbg.__wbg_set_cache_2f9deb19b92b81e3 = function(arg0, arg1) {
        arg0.cache = __wbindgen_enum_RequestCache[arg1];
    };
    imports.wbg.__wbg_set_credentials_f621cd2d85c0c228 = function(arg0, arg1) {
        arg0.credentials = __wbindgen_enum_RequestCredentials[arg1];
    };
    imports.wbg.__wbg_set_headers_6926da238cd32ee4 = function(arg0, arg1) {
        arg0.headers = arg1;
    };
    imports.wbg.__wbg_set_method_c02d8cbbe204ac2d = function(arg0, arg1, arg2) {
        arg0.method = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_set_mode_52ef73cfa79639cb = function(arg0, arg1) {
        arg0.mode = __wbindgen_enum_RequestMode[arg1];
    };
    imports.wbg.__wbg_set_onabort_6957ef4f3e5c91eb = function(arg0, arg1) {
        arg0.onabort = arg1;
    };
    imports.wbg.__wbg_set_oncomplete_71dbeb19a31158ae = function(arg0, arg1) {
        arg0.oncomplete = arg1;
    };
    imports.wbg.__wbg_set_onerror_2a8ad6135dc1ec74 = function(arg0, arg1) {
        arg0.onerror = arg1;
    };
    imports.wbg.__wbg_set_onerror_dc82fea584ffccaa = function(arg0, arg1) {
        arg0.onerror = arg1;
    };
    imports.wbg.__wbg_set_onsuccess_f367d002b462109e = function(arg0, arg1) {
        arg0.onsuccess = arg1;
    };
    imports.wbg.__wbg_set_onupgradeneeded_0a519a73284a1418 = function(arg0, arg1) {
        arg0.onupgradeneeded = arg1;
    };
    imports.wbg.__wbg_set_signal_dda2cf7ccb6bee0f = function(arg0, arg1) {
        arg0.signal = arg1;
    };
    imports.wbg.__wbg_set_unique_ddf37f59b6c8fc8c = function(arg0, arg1) {
        arg0.unique = arg1 !== 0;
    };
    imports.wbg.__wbg_settingsDidChange_82d9c2e01f0a0462 = function(arg0) {
        const ret = arg0.settingsDidChange;
        return ret;
    };
    imports.wbg.__wbg_signal_4db5aa055bf9eb9a = function(arg0) {
        const ret = arg0.signal;
        return ret;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_89e1d9ac6a1b250e = function() {
        const ret = typeof global === 'undefined' ? null : global;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_8b530f326a9e48ac = function() {
        const ret = typeof globalThis === 'undefined' ? null : globalThis;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_SELF_6fdf4b64710cc91b = function() {
        const ret = typeof self === 'undefined' ? null : self;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_WINDOW_b45bfc5a37f6cfa2 = function() {
        const ret = typeof window === 'undefined' ? null : window;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_status_de7eed5a7a5bfd5d = function(arg0) {
        const ret = arg0.status;
        return ret;
    };
    imports.wbg.__wbg_stringify_b5fb28f6465d9c3e = function() { return handleError(function (arg0) {
        const ret = JSON.stringify(arg0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_subarray_480600f3d6a9f26c = function(arg0, arg1, arg2) {
        const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
        return ret;
    };
    imports.wbg.__wbg_target_1447f5d3a6fa6fe0 = function(arg0) {
        const ret = arg0.target;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_text_dc33c15c17bdfb52 = function() { return handleError(function (arg0) {
        const ret = arg0.text();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_then_4f46f6544e6b4a28 = function(arg0, arg1) {
        const ret = arg0.then(arg1);
        return ret;
    };
    imports.wbg.__wbg_then_70d05cf780a18d77 = function(arg0, arg1, arg2) {
        const ret = arg0.then(arg1, arg2);
        return ret;
    };
    imports.wbg.__wbg_toString_7da7c8dbec78fcb8 = function(arg0) {
        const ret = arg0.toString();
        return ret;
    };
    imports.wbg.__wbg_transaction_0aa5a83862993431 = function(arg0) {
        const ret = arg0.transaction;
        return ret;
    };
    imports.wbg.__wbg_transaction_253405fd3a30ed91 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = arg0.transaction(getStringFromWasm0(arg1, arg2), __wbindgen_enum_IdbTransactionMode[arg3]);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_transaction_9fb8349a0a81725c = function(arg0) {
        const ret = arg0.transaction;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_transaction_cd940bd89781f616 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.transaction(arg1, __wbindgen_enum_IdbTransactionMode[arg2]);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_transmissionProgress_2666ed100eb4389b = function(arg0) {
        const ret = arg0.transmissionProgress;
        return ret;
    };
    imports.wbg.__wbg_uniffiFree_2092d04da5413eb0 = function(arg0) {
        const ret = arg0.uniffiFree;
        return ret;
    };
    imports.wbg.__wbg_update_b5b141e892653acb = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.update(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_upperBound_8d0e896ba7b1d0ea = function() { return handleError(function (arg0, arg1) {
        const ret = IDBKeyRange.upperBound(arg0, arg1 !== 0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_url_b36d2a5008eb056f = function(arg0, arg1) {
        const ret = arg1.url;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_value_692627309814bb8c = function(arg0) {
        const ret = arg0.value;
        return ret;
    };
    imports.wbg.__wbg_value_bf03593c8a7b58b8 = function() { return handleError(function (arg0) {
        const ret = arg0.value;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_version_3fba3018546c9670 = function(arg0) {
        const ret = arg0.version;
        return ret;
    };
    imports.wbg.__wbg_versions_c71aa1626a93e0a1 = function(arg0) {
        const ret = arg0.versions;
        return ret;
    };
    imports.wbg.__wbindgen_cast_16f199ad30238a81 = function(arg0, arg1) {
        // Cast intrinsic for `Closure(Closure { dtor_idx: 9026, function: Function { arguments: [NamedExternref("Event")], shim_idx: 9029, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
        const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h30cdae25c9f6f32e, wasm_bindgen__convert__closures_____invoke__h55e17fb981617ceb);
        return ret;
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_cast_4197872f88b53b61 = function(arg0, arg1) {
        // Cast intrinsic for `Closure(Closure { dtor_idx: 12280, function: Function { arguments: [Externref], shim_idx: 12281, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
        const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h5904df7707e9fed6, wasm_bindgen__convert__closures_____invoke__h8a7dd692e8d2212a);
        return ret;
    };
    imports.wbg.__wbindgen_cast_4625c577ab2ec9ee = function(arg0) {
        // Cast intrinsic for `U64 -> Externref`.
        const ret = BigInt.asUintN(64, arg0);
        return ret;
    };
    imports.wbg.__wbindgen_cast_56089af11ba0ae75 = function(arg0, arg1) {
        // Cast intrinsic for `Closure(Closure { dtor_idx: 3601, function: Function { arguments: [NamedExternref("IDBVersionChangeEvent")], shim_idx: 3602, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
        const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h96d2bc0af12c087d, wasm_bindgen__convert__closures_____invoke__h8ec0c23431aa9068);
        return ret;
    };
    imports.wbg.__wbindgen_cast_8656ed496985edd5 = function(arg0, arg1) {
        // Cast intrinsic for `Closure(Closure { dtor_idx: 9026, function: Function { arguments: [], shim_idx: 9027, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
        const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h30cdae25c9f6f32e, wasm_bindgen__convert__closures_____invoke__h1fe746909eefbd44);
        return ret;
    };
    imports.wbg.__wbindgen_cast_9ae0607507abb057 = function(arg0) {
        // Cast intrinsic for `I64 -> Externref`.
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_cast_b392ddab3d60d014 = function(arg0, arg1) {
        // Cast intrinsic for `Closure(Closure { dtor_idx: 12338, function: Function { arguments: [], shim_idx: 12339, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
        const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__h4c2e3d8d0b251187, wasm_bindgen__convert__closures_____invoke__ha24c9e313954a856);
        return ret;
    };
    imports.wbg.__wbindgen_cast_cb9088102bce6b30 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
        const ret = getArrayU8FromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_cast_d6cd19b81560fd6e = function(arg0) {
        // Cast intrinsic for `F64 -> Externref`.
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_cast_dd7cbcaa277e6b82 = function(arg0, arg1) {
        // Cast intrinsic for `Closure(Closure { dtor_idx: 9149, function: Function { arguments: [], shim_idx: 9150, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
        const ret = makeMutClosure(arg0, arg1, wasm.wasm_bindgen__closure__destroy__hd4442ac79c761dd4, wasm_bindgen__convert__closures_____invoke__h6b53e77f7a4c6c68);
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
        ;
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }


    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;

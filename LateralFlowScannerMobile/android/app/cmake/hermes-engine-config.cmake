# hermes-engine-config.cmake
# Bridges react-native-worklets-core's CMake requirements to the Hermes library in gradle cache
#
# This file satisfies: find_package(hermes-engine REQUIRED CONFIG)
# And provides targets: hermes-engine::hermesvm AND hermes-engine::libhermes

# Gradle cache path where hermes-android is extracted
# Handle Windows paths correctly
if(WIN32)
    set(GRADLE_USER_HOME "$ENV{USERPROFILE}\\.gradle")
    string(REPLACE "\\" "/" GRADLE_USER_HOME "${GRADLE_USER_HOME}")
else()
    set(GRADLE_USER_HOME "$ENV{HOME}/.gradle")
endif()

message(STATUS "[Hermes Config] GRADLE_USER_HOME: ${GRADLE_USER_HOME}")
message(STATUS "[Hermes Config] ANDROID_ABI: ${ANDROID_ABI}")

# Search multiple Gradle cache versions (8.x common versions)
set(HERMES_JNI_DIR "")
foreach(GRADLE_VERSION "8.13" "8.12" "8.11" "8.10" "8.9" "8.8" "8.7" "8.6" "8.5")
    set(HERMES_GRADLE_CACHE "${GRADLE_USER_HOME}/caches/${GRADLE_VERSION}/transforms")
    
    if(EXISTS "${HERMES_GRADLE_CACHE}")
        message(STATUS "[Hermes Config] Searching in: ${HERMES_GRADLE_CACHE}")
        
        # Find the hermes-android directory with JNI structure (not prefab)
        file(GLOB HERMES_TRANSFORM_DIRS "${HERMES_GRADLE_CACHE}/*/transformed/jetified-hermes-android-*-debug")
        
        foreach(DIR ${HERMES_TRANSFORM_DIRS})
            if(EXISTS "${DIR}/jni/${ANDROID_ABI}/libhermesvm.so")
                set(HERMES_JNI_DIR "${DIR}/jni")
                message(STATUS "[Hermes Config] Found JNI dir at: ${HERMES_JNI_DIR}")
                break()
            endif()
        endforeach()
        
        if(HERMES_JNI_DIR)
            break()
        endif()
    endif()
endforeach()

if(HERMES_JNI_DIR)
    # Determine the ABI-specific library path
    set(HERMES_LIB_PATH "${HERMES_JNI_DIR}/${ANDROID_ABI}/libhermesvm.so")
    
    # Find include directory - try prefab first, then fall back to other locations
    set(HERMES_INCLUDE_DIR "")
    get_filename_component(HERMES_BASE_DIR "${HERMES_JNI_DIR}" DIRECTORY)
    
    if(EXISTS "${HERMES_BASE_DIR}/prefab/modules/hermesvm/include")
        set(HERMES_INCLUDE_DIR "${HERMES_BASE_DIR}/prefab/modules/hermesvm/include")
    elseif(EXISTS "${HERMES_BASE_DIR}/include")
        set(HERMES_INCLUDE_DIR "${HERMES_BASE_DIR}/include")
    endif()
    
    message(STATUS "[Hermes Config] Library path: ${HERMES_LIB_PATH}")
    message(STATUS "[Hermes Config] Include dir: ${HERMES_INCLUDE_DIR}")
    
    if(EXISTS "${HERMES_LIB_PATH}")
        # Create hermes-engine::hermesvm (for RN 0.82+ / Worklets 0.7.x)
        if(NOT TARGET hermes-engine::hermesvm)
            add_library(hermes-engine::hermesvm SHARED IMPORTED)
            set_target_properties(hermes-engine::hermesvm PROPERTIES
                IMPORTED_LOCATION "${HERMES_LIB_PATH}"
            )
            if(HERMES_INCLUDE_DIR AND EXISTS "${HERMES_INCLUDE_DIR}")
                set_target_properties(hermes-engine::hermesvm PROPERTIES
                    INTERFACE_INCLUDE_DIRECTORIES "${HERMES_INCLUDE_DIR}"
                )
            endif()
            message(STATUS "[Hermes Config] Created hermes-engine::hermesvm")
        endif()
        
        # Create hermes-engine::libhermes (for worklets-core which uses old target name)
        if(NOT TARGET hermes-engine::libhermes)
            add_library(hermes-engine::libhermes SHARED IMPORTED)
            set_target_properties(hermes-engine::libhermes PROPERTIES
                IMPORTED_LOCATION "${HERMES_LIB_PATH}"
            )
            if(HERMES_INCLUDE_DIR AND EXISTS "${HERMES_INCLUDE_DIR}")
                set_target_properties(hermes-engine::libhermes PROPERTIES
                    INTERFACE_INCLUDE_DIRECTORIES "${HERMES_INCLUDE_DIR}"
                )
            endif()
            message(STATUS "[Hermes Config] Created hermes-engine::libhermes")
        endif()
        
        message(STATUS "[Hermes Config] SUCCESS")
    else()
        message(FATAL_ERROR "[Hermes Config] libhermesvm.so not found at ${HERMES_LIB_PATH}")
    endif()
else()
    message(FATAL_ERROR "[Hermes Config] Could not find hermes-android JNI in gradle cache. Searched in GRADLE_USER_HOME: ${GRADLE_USER_HOME}")
endif()


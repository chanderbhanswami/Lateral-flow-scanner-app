cmake_minimum_required(VERSION 3.13)

# Define the library name matching what Java expects (OpenCVModule loads "lateral-flow-cpp")
project(appmodules)

# 1. Setup for React Native
# Calculate paths relative to src/main/cpp
set(REACT_APP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../..")
set(REACT_ANDROID_DIR "${REACT_APP_DIR}/node_modules/react-native/ReactAndroid")
set(RN_CMAKE_DIR "${REACT_ANDROID_DIR}/cmake-utils")

# 2. Include RN Application CMake
# This automatically:
# - Globs and compiles standard RN C++ files AND our *.cpp files (native-lib.cpp)
# - Links against JSI, Fabric, and Autolinked libraries (BootSplash!)
# - Creates the shared library target named ${CMAKE_PROJECT_NAME} ("lateral-flow-cpp")
include(${RN_CMAKE_DIR}/ReactNative-application.cmake)

# 3. User's specific logic for OpenCV
# We simply add the dependencies to the target created by ReactNative-application.cmake
find_package(OpenCV REQUIRED COMPONENTS OpenCV::opencv_java4)

target_link_libraries(${CMAKE_PROJECT_NAME}
    OpenCV::opencv_java4
    # android and log are already linked by ReactNative-application.cmake
)

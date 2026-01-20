cmake_minimum_required(VERSION 3.4.1)

project(lateral-flow-cpp)

# Find OpenCV via Prefab (exposed by 'implementation org.opencv:opencv:4.x.x')
find_package(OpenCV REQUIRED COMPONENTS OpenCV::opencv_java4)

add_library(lateral-flow-cpp SHARED native-lib.cpp)

# Link against Android logs and OpenCV
target_link_libraries(lateral-flow-cpp
    android
    log
    OpenCV::opencv_java4
)

import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { AllSensorData, AlignmentAnalysis, AnalysisResult, FrameAnalysis } from '../../types';

interface SensorDisplayProps {
    sensorData: AllSensorData | null;
    lightLevel: number;
    isShaking: boolean;
    alignment: AlignmentAnalysis | null;
    analysisData?: any; // To receive frameAnalysis and other real-time data
}

export const SensorDisplay: React.FC<SensorDisplayProps> = ({
    sensorData,
    lightLevel,
    isShaking,
    alignment,
    analysisData
}) => {
    // Extract real-time frame analysis if available
    const frameAnalysis = analysisData?.frameAnalysis as FrameAnalysis | undefined;
    const borderData = analysisData?.borderDetection || analysisData?.borderCorners ? { detected: !!analysisData.borderCorners } : null;

    const renderItem = (label: string, value: string | number, color?: string) => (
        <View style={styles.item}>
            <Text style={styles.label}>{label}:</Text>
            <Text style={[styles.value, color ? { color } : undefined]}>{value}</Text>
        </View>
    );

    const renderSectionHeader = (title: string) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* --- SENSORS & STABILITY --- */}
                {renderSectionHeader("Device Motion")}
                {renderItem("Shake", isShaking ? "YES" : "No", isShaking ? "#ef4444" : "#10b981")}
                {alignment && (
                    <>
                        {renderItem("Pitch", `${alignment.pitch.toFixed(1)}°`)}
                        {renderItem("Roll", `${alignment.roll.toFixed(1)}°`)}
                        {renderItem("Level", `${(alignment.levelness * 100).toFixed(0)}%`, alignment.isAligned ? "#10b981" : "#f59e0b")}
                    </>
                )}

                {/* --- LIGHTING --- */}
                {renderSectionHeader("Environmental")}
                {renderItem("Ambient Light", `${lightLevel.toFixed(0)} lux`, lightLevel < 100 ? "#ef4444" : "#10b981")}
                {renderItem("Proximity", sensorData?.proximity?.distance !== undefined ? (sensorData.proximity.distance === 0 ? "NEAR" : "FAR") : "N/A")}

                {/* --- FRAME ANALYSIS (The missing parts) --- */}
                {frameAnalysis && (
                    <>
                        {renderSectionHeader("Image Quality")}
                        {renderItem("Blur", frameAnalysis.blurAnalysis?.isBlurry ? "BLURRY" : "Clear", frameAnalysis.blurAnalysis?.isBlurry ? "#ef4444" : "#10b981")}
                        {renderItem("Blur Score", frameAnalysis.blurAnalysis?.blurScore?.toFixed(0) || "N/A")}

                        {renderItem("Exposure", frameAnalysis.exposureAnalysis?.isUnderexposed ? "Too Dark" : (frameAnalysis.exposureAnalysis?.isOverexposed ? "Too Bright" : "Good"), frameAnalysis.exposureAnalysis?.isUnderexposed || frameAnalysis.exposureAnalysis?.isOverexposed ? "#f59e0b" : "#10b981")}
                        {/* {renderItem("Luminance", frameAnalysis.exposureAnalysis?.lumaTarget ? `${frameAnalysis.exposureAnalysis.lumaTarget.toFixed(0)}` : "-")} */}

                        {renderSectionHeader("Environment")}
                        {renderItem("Shadows", frameAnalysis.shadowAnalysis?.hasShadow ? "Detected" : "None", frameAnalysis.shadowAnalysis?.hasShadow ? "#f59e0b" : "#10b981")}
                        {frameAnalysis.shadowAnalysis?.hasShadow && renderItem("Coverage", `${((frameAnalysis.shadowAnalysis as any)?.shadowCoverage * 100)?.toFixed(0)}%`)}

                        {renderItem("Reflections", frameAnalysis.reflectionAnalysis?.hasReflection ? "Detected" : "None", frameAnalysis.reflectionAnalysis?.hasReflection ? "#f59e0b" : "#10b981")}
                        {frameAnalysis.reflectionAnalysis?.hasReflection && renderItem("Affected", `${((frameAnalysis.reflectionAnalysis as any)?.affectedArea * 100)?.toFixed(0)}%`)}

                        {renderItem("Cam Light", `${(frameAnalysis.histogram?.brightness ? (frameAnalysis.histogram.brightness.reduce((a: number, b: number) => a + b, 0) / 256).toFixed(0) : "N/A")}`, "#fbbf24")}

                        {renderSectionHeader("Color / WB")}
                        {renderItem("Status", frameAnalysis.whiteBalanceAnalysis?.isBalanced ? "Balanced" : "Tinted", frameAnalysis.whiteBalanceAnalysis?.isBalanced ? "#10b981" : "#f59e0b")}
                        {renderItem("Tint", (frameAnalysis.whiteBalanceAnalysis as any)?.correction?.tint ? `${(frameAnalysis.whiteBalanceAnalysis as any).correction.tint.toFixed(1)}` : "-")}
                        {renderItem("Temp", (frameAnalysis.whiteBalanceAnalysis as any)?.correction?.temperature ? `${(frameAnalysis.whiteBalanceAnalysis as any).correction.temperature.toFixed(0)}K` : "-")}
                        {renderItem("Dom. Ch", frameAnalysis.whiteBalanceAnalysis?.dominantChannel || "-")}

                        {renderSectionHeader("Focus / Kit")}
                        {renderItem("Focus User", frameAnalysis.focusAnalysis?.needsFocus ? "REFOCUS" : "Good", frameAnalysis.focusAnalysis?.needsFocus ? "#ef4444" : "#10b981")}
                        {renderItem("Border Det.", borderData?.detected ? "YES" : "Searching...", borderData?.detected ? "#10b981" : "#cbd5e1")}
                    </>
                )}

                {/* --- CAMERA INFO (Mock/Static if unavailable) --- */}
                {renderSectionHeader("Camera Settings")}
                {renderItem("ISO", "Auto")}
                {renderItem("Shutter", "Auto")}
                {renderItem("Aperture", "f/1.8")}

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 80, // Moved up slightly
        left: 10,
        width: 160,
        height: 380, // Fixed height with scroll
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden'
    },
    scrollContent: {
        padding: 10,
    },
    sectionHeader: {
        color: '#9ca3af',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 8,
        marginBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
        paddingBottom: 2
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    label: {
        color: '#d1d5db',
        fontSize: 11,
        fontWeight: '500',
        marginRight: 8,
    },
    value: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right'
    },
    warning: {
        color: '#fbbf24',
    },
    success: {
        color: '#10b981',
    },
});
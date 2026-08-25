package com.ssb.fieldscreening.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val SsbColorScheme = lightColorScheme(
    primary = SsbColors.Accent,
    onPrimary = Color.White,
    primaryContainer = SsbColors.AccentTint,
    onPrimaryContainer = SsbColors.AccentInk,
    secondary = SsbColors.GreenPass,
    onSecondary = Color.White,
    secondaryContainer = SsbColors.GreenBg,
    onSecondaryContainer = SsbColors.GreenDark,
    tertiary = SsbColors.AmberWarn,
    onTertiary = Color.White,
    tertiaryContainer = SsbColors.AmberBg,
    onTertiaryContainer = SsbColors.AmberDark,
    error = SsbColors.RedAlert,
    onError = Color.White,
    errorContainer = SsbColors.RedBg,
    onErrorContainer = SsbColors.RedDark,
    background = SsbColors.BaseCanvas,
    onBackground = SsbColors.TextPrimary,
    surface = SsbColors.SupportingSurface,
    onSurface = SsbColors.TextPrimary,
    surfaceVariant = SsbColors.SurfaceInset,
    onSurfaceVariant = SsbColors.TextSecondary,
    outline = SsbColors.StructuralBorder,
    outlineVariant = SsbColors.ActiveBorder,
    surfaceContainerLowest = SsbColors.SupportingSurface,
    surfaceContainerLow = SsbColors.BaseCanvas,
    surfaceContainer = SsbColors.SurfaceInset,
    surfaceContainerHigh = SsbColors.HoverStrong,
    surfaceContainerHighest = SsbColors.HoverStrong,
)

@Composable
fun SsbInspectionTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = SsbColorScheme,
        typography = Typography,
        content = content
    )
}

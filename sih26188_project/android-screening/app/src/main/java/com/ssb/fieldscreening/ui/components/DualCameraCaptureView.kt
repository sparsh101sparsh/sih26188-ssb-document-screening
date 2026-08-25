package com.ssb.fieldscreening.ui.components

import android.Manifest
import android.graphics.BitmapFactory
import android.util.Log
import androidx.camera.core.CameraControl
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Camera
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CenterFocusStrong
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DocumentScanner
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.FlipCameraAndroid
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.ssb.fieldscreening.data.model.InspectionResponse
import com.ssb.fieldscreening.data.model.PresetScenario
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes
import com.ssb.fieldscreening.ui.viewmodel.CameraState
import com.ssb.fieldscreening.util.ImageUtils

enum class CameraTarget {
    DOCUMENT_REAR,
    TRAVELER_FRONT
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun DualCameraCaptureView(
    selectedPreset: PresetScenario?,
    inspection: InspectionResponse?,
    isInspecting: Boolean,
    cameraState: CameraState = CameraState.IDLE,
    progressText: String,
    onRunInspection: () -> Unit,
    showHeatmapOverlay: Boolean,
    onToggleHeatmap: () -> Unit,
    capturedDocumentBytes: ByteArray? = null,
    capturedLiveFaceBytes: ByteArray? = null,
    onDocumentCaptured: ((ByteArray) -> Unit)? = null,
    onLiveFaceCaptured: ((ByteArray) -> Unit)? = null,
    onClearCaptures: (() -> Unit)? = null,
    companionUploadStatus: String? = null,
    modifier: Modifier = Modifier
) {
    val cameraPermissionState = rememberPermissionState(Manifest.permission.CAMERA)

    if (!cameraPermissionState.status.isGranted) {
        CameraPermissionRationaleCard(
            onRequestPermission = { cameraPermissionState.launchPermissionRequest() },
            modifier = modifier
        )
    } else {
        CameraXCaptureContainer(
            selectedPreset = selectedPreset,
            inspection = inspection,
            isInspecting = isInspecting,
            cameraState = cameraState,
            progressText = progressText,
            onRunInspection = onRunInspection,
            showHeatmapOverlay = showHeatmapOverlay,
            onToggleHeatmap = onToggleHeatmap,
            capturedDocumentBytes = capturedDocumentBytes,
            capturedLiveFaceBytes = capturedLiveFaceBytes,
            onDocumentCaptured = onDocumentCaptured,
            onLiveFaceCaptured = onLiveFaceCaptured,
            onClearCaptures = onClearCaptures,
            companionUploadStatus = companionUploadStatus,
            modifier = modifier
        )
    }
}

@Composable
fun CameraPermissionRationaleCard(
    onRequestPermission: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = SsbColors.SupportingSurface,
        shape = SsbShapes.card,
        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.AmberWarn)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "Permission Alert",
                    tint = SsbColors.AmberWarn,
                    modifier = Modifier.size(22.dp)
                )
                Text(
                    text = "Camera access required",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = SsbColors.TextPrimary
                )
            }

            Text(
                text = "Live optical camera sensor access is required for real-time document scanning (rear sensor) and traveler biometric selfie verification (front sensor) at border checkpoints.",
                fontSize = 12.sp,
                color = SsbColors.TextPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Button(
                onClick = onRequestPermission,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .testTag("grant_camera_permission_btn"),
                colors = ButtonDefaults.buttonColors(
                    containerColor = SsbColors.AmberWarn,
                    contentColor = Color.Black
                ),
                shape = SsbShapes.control
            ) {
                Icon(
                    imageVector = Icons.Default.CameraAlt,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Grant camera permission",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
            }
        }
    }
}

/**
 * Quiet, Decluttered Full-Bleed Dual Sensor Viewport
 */
@Composable
fun CameraXCaptureContainer(
    selectedPreset: PresetScenario?,
    inspection: InspectionResponse?,
    isInspecting: Boolean,
    cameraState: CameraState = CameraState.IDLE,
    progressText: String,
    onRunInspection: () -> Unit,
    showHeatmapOverlay: Boolean,
    onToggleHeatmap: () -> Unit,
    capturedDocumentBytes: ByteArray?,
    capturedLiveFaceBytes: ByteArray?,
    onDocumentCaptured: ((ByteArray) -> Unit)?,
    onLiveFaceCaptured: ((ByteArray) -> Unit)?,
    onClearCaptures: (() -> Unit)?,
    companionUploadStatus: String? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var activeTarget by remember { mutableStateOf(CameraTarget.DOCUMENT_REAR) }
    var isTorchOn by remember { mutableStateOf(false) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var cameraControl by remember { mutableStateOf<CameraControl?>(null) }
    var isCameraBound by remember { mutableStateOf(false) }
    var isCapturing by remember { mutableStateOf(false) }

    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }

    val cameraSelector = if (activeTarget == CameraTarget.DOCUMENT_REAR) {
        CameraSelector.DEFAULT_BACK_CAMERA
    } else {
        CameraSelector.DEFAULT_FRONT_CAMERA
    }

    LaunchedEffect(activeTarget) {
        try {
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            val executor = ContextCompat.getMainExecutor(context)
            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    cameraProvider.unbindAll()

                    val preview = Preview.Builder()
                        .build()
                        .also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }

                    val capture = ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()

                    imageCapture = capture

                    val camera = cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        preview,
                        capture
                    )
                    cameraControl = camera.cameraControl
                    isCameraBound = true
                } catch (e: Exception) {
                    Log.w("DualCameraCaptureView", "Camera binding failed: ${e.message}")
                    isCameraBound = false
                }
            }, executor)
        } catch (e: Exception) {
            Log.w("DualCameraCaptureView", "Camera provider error: ${e.message}")
            isCameraBound = false
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            try {
                val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
                if (cameraProviderFuture.isDone) {
                    cameraProviderFuture.get().unbindAll()
                }
            } catch (e: Exception) {
                // cleanup
            }
        }
    }

    val takePhoto: (CameraTarget) -> Unit = { target ->
        val capture = imageCapture
        if (capture != null) {
            isCapturing = true
            val executor = ContextCompat.getMainExecutor(context)
            try {
                capture.takePicture(
                    executor,
                    object : ImageCapture.OnImageCapturedCallback() {
                        override fun onCaptureSuccess(imageProxy: ImageProxy) {
                            try {
                                val compressedBytes = ImageUtils.processImageProxy(imageProxy)
                                if (target == CameraTarget.DOCUMENT_REAR) {
                                    onDocumentCaptured?.invoke(compressedBytes)
                                } else {
                                    onLiveFaceCaptured?.invoke(compressedBytes)
                                }
                            } catch (e: Exception) {
                                Log.e("DualCameraCaptureView", "Image processing error: ${e.message}", e)
                            } finally {
                                imageProxy.close()
                                isCapturing = false
                            }
                        }

                        override fun onError(exception: ImageCaptureException) {
                            Log.e("DualCameraCaptureView", "Capture failed: ${exception.message}", exception)
                            isCapturing = false
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e("DualCameraCaptureView", "takePicture exception: ${e.message}", e)
                isCapturing = false
            }
        }
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        color = SsbColors.SupportingSurface,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.StructuralBorder),
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 1. Lens Mode Selector Tabs (Clean 46dp touch targets)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Document Camera Tab
                val isDocActive = activeTarget == CameraTarget.DOCUMENT_REAR
                val docTabBg = if (isDocActive) SsbColors.AccentTint else SsbColors.SurfaceInset
                val docTabBorder = if (isDocActive) SsbColors.Accent.copy(alpha = 0.35f) else SsbColors.StructuralBorder
                val docTabColor = if (isDocActive) SsbColors.AccentInk else SsbColors.TextMuted

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(46.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(docTabBg)
                        .border(1.dp, docTabBorder, RoundedCornerShape(10.dp))
                        .clickable { activeTarget = CameraTarget.DOCUMENT_REAR }
                        .padding(horizontal = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.DocumentScanner,
                            contentDescription = null,
                            tint = if (isDocActive) SsbColors.Accent else SsbColors.TextMuted,
                            modifier = Modifier.size(17.dp)
                        )
                        Text(
                            text = "Document",
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = docTabColor
                        )
                        if (capturedDocumentBytes != null) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(SsbColors.GreenPass)
                            )
                        }
                    }
                }

                // Selfie Camera Tab
                val isFaceActive = activeTarget == CameraTarget.TRAVELER_FRONT
                val faceTabBg = if (isFaceActive) SsbColors.AccentTint else SsbColors.SurfaceInset
                val faceTabBorder = if (isFaceActive) SsbColors.Accent.copy(alpha = 0.35f) else SsbColors.StructuralBorder
                val faceTabColor = if (isFaceActive) SsbColors.AccentInk else SsbColors.TextMuted

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(46.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(faceTabBg)
                        .border(1.dp, faceTabBorder, RoundedCornerShape(10.dp))
                        .clickable { activeTarget = CameraTarget.TRAVELER_FRONT }
                        .padding(horizontal = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Face,
                            contentDescription = null,
                            tint = if (isFaceActive) SsbColors.Accent else SsbColors.TextMuted,
                            modifier = Modifier.size(17.dp)
                        )
                        Text(
                            text = "Traveler photo",
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = faceTabColor
                        )
                        if (capturedLiveFaceBytes != null) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(SsbColors.GreenPass)
                            )
                        }
                    }
                }
            }

            // 2. Premium Dark Viewfinder (250dp Height for single-screen zero-scroll fit)
            val currentCapturedBytes = if (activeTarget == CameraTarget.DOCUMENT_REAR) capturedDocumentBytes else capturedLiveFaceBytes
            val hasCapture = currentCapturedBytes != null

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(250.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color(0xFF0F172A))
                    .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                // Live camera preview when not viewing static capture
                if (!hasCapture) {
                    AndroidView(
                        factory = { previewView },
                        modifier = Modifier.fillMaxSize()
                    )

                    // Reticle Framing Overlay (Starts cleanly below HUD)
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val w = size.width
                        val h = size.height

                        if (activeTarget == CameraTarget.DOCUMENT_REAR) {
                            // Document Frame Guide (Corner Brackets positioned cleanly below HUD)
                            val padX = w * 0.08f
                            val topY = h * 0.18f
                            val botY = h * 0.88f
                            val cornerLen = 22.dp.toPx()
                            val strokeW = 3.dp.toPx()
                            val color = Color(0xFF38BDF8)

                            // Top-Left Corner
                            drawLine(color, Offset(padX, topY), Offset(padX + cornerLen, topY), strokeW)
                            drawLine(color, Offset(padX, topY), Offset(padX, topY + cornerLen), strokeW)

                            // Top-Right Corner
                            drawLine(color, Offset(w - padX, topY), Offset(w - padX - cornerLen, topY), strokeW)
                            drawLine(color, Offset(w - padX, topY), Offset(w - padX, topY + cornerLen), strokeW)

                            // Bottom-Left Corner
                            drawLine(color, Offset(padX, botY), Offset(padX + cornerLen, botY), strokeW)
                            drawLine(color, Offset(padX, botY), Offset(padX, botY - cornerLen), strokeW)

                            // Bottom-Right Corner
                            drawLine(color, Offset(w - padX, botY), Offset(w - padX - cornerLen, botY), strokeW)
                            drawLine(color, Offset(w - padX, botY), Offset(w - padX, botY - cornerLen), strokeW)
                        } else {
                            // Selfie Oval Reticle centered in lower area
                            drawOval(
                                color = Color(0xFF38BDF8).copy(alpha = 0.85f),
                                topLeft = Offset(w * 0.22f, h * 0.16f),
                                size = Size(w * 0.56f, h * 0.72f),
                                style = Stroke(width = 2.8.dp.toPx())
                            )
                        }
                    }
                } else {
                    // Show captured image preview
                    val bitmap = remember(currentCapturedBytes) {
                        currentCapturedBytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
                    }
                    if (bitmap != null) {
                        Image(
                            bitmap = bitmap.asImageBitmap(),
                            contentDescription = "Captured Image",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Fit
                        )
                    }
                }

                // Dark Translucent HUD Controls Overlay
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(10.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Sleek Dark HUD Status Badge
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.Black.copy(alpha = 0.65f))
                                .border(1.dp, Color.White.copy(alpha = 0.20f), RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(if (hasCapture) SsbColors.GreenPass else Color(0xFF38BDF8))
                                )
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = if (hasCapture) "CAPTURED" else if (activeTarget == CameraTarget.DOCUMENT_REAR) "ALIGN DOCUMENT" else "CENTER FACE",
                                    fontSize = 9.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = Color.White
                                )
                            }
                        }

                        // Top-Right Floating Controls (Dark Glass Circles)
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Camera Flip Button (Always visible when not viewing captured still)
                            if (!hasCapture) {
                                IconButton(
                                    onClick = {
                                        activeTarget = if (activeTarget == CameraTarget.DOCUMENT_REAR) {
                                            CameraTarget.TRAVELER_FRONT
                                        } else {
                                            CameraTarget.DOCUMENT_REAR
                                        }
                                    },
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(Color.Black.copy(alpha = 0.65f))
                                        .border(1.dp, Color.White.copy(alpha = 0.20f), CircleShape)
                                        .testTag("switch_camera_lens_btn")
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.FlipCameraAndroid,
                                        contentDescription = "Switch Camera (Front/Back)",
                                        tint = Color.White,
                                        modifier = Modifier.size(17.dp)
                                    )
                                }
                            }

                            // Torch Button (Document mode only)
                            if (activeTarget == CameraTarget.DOCUMENT_REAR && !hasCapture) {
                                IconButton(
                                    onClick = {
                                        val next = !isTorchOn
                                        cameraControl?.enableTorch(next)
                                        isTorchOn = next
                                    },
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(Color.Black.copy(alpha = 0.65f))
                                        .border(1.dp, Color.White.copy(alpha = 0.20f), CircleShape)
                                ) {
                                    Icon(
                                        imageVector = if (isTorchOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                                        contentDescription = "Torch",
                                        tint = if (isTorchOn) Color(0xFFFBBF24) else Color.White,
                                        modifier = Modifier.size(17.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Bottom info & retake badge if captured
                    if (hasCapture) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color.Black.copy(alpha = 0.75f))
                                    .border(1.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(8.dp))
                                    .clickable {
                                        if (activeTarget == CameraTarget.DOCUMENT_REAR) {
                                            onDocumentCaptured?.invoke(ByteArray(0))
                                        } else {
                                            onLiveFaceCaptured?.invoke(ByteArray(0))
                                        }
                                        onClearCaptures?.invoke()
                                    }
                                    .padding(horizontal = 12.dp, vertical = 7.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Refresh,
                                        contentDescription = null,
                                        tint = Color(0xFF38BDF8),
                                        modifier = Modifier.size(15.dp)
                                    )
                                    Spacer(modifier = Modifier.width(5.dp))
                                    Text(
                                        text = "Retake",
                                        fontSize = 11.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF38BDF8)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 3. Ergonomic Camera Shutter & Status Controls
            if (!hasCapture) {
                // Shutter Button (54dp height, rich blue, clear icon)
                Button(
                    onClick = { takePhoto(activeTarget) },
                    enabled = !isInspecting && !isCapturing,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .testTag("snap_camera_btn"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SsbColors.BlueInteraction,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isCapturing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.5.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Capturing frame…", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (activeTarget == CameraTarget.DOCUMENT_REAR) "SNAP IDENTITY DOCUMENT" else "SNAP TRAVELER PHOTO",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.3.sp
                            )
                        }
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Instant Handshake Confirmation Badge
                    val statusText = companionUploadStatus ?: "✓ Frame Synced to Desktop Terminal"
                    val isTransmitting = statusText.contains("Transmitting")
                    val isError = statusText.contains("⚠️") || statusText.contains("Offline")

                    val badgeBg = if (isTransmitting) Color(0xFFFEF3C7) else if (isError) Color(0xFFFEE2E2) else SsbColors.GreenBg
                    val badgeBorder = if (isTransmitting) Color(0xFFFCD34D) else if (isError) Color(0xFFFCA5A5) else SsbColors.GreenBorder
                    val dotColor = if (isTransmitting) Color(0xFFD97706) else if (isError) Color(0xFFDC2626) else SsbColors.GreenPass
                    val textColor = if (isTransmitting) Color(0xFF92400E) else if (isError) Color(0xFF991B1B) else SsbColors.GreenDark

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(badgeBg)
                            .border(1.dp, badgeBorder, RoundedCornerShape(10.dp))
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(dotColor)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = statusText,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = textColor
                        )
                    }

                    // Full-Bleed Primary Inspection Button
                    Button(
                        onClick = { onRunInspection() },
                        enabled = !isInspecting,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp)
                            .testTag("evaluate_screen_btn"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SsbColors.Accent,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isInspecting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.5.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = progressText.ifBlank { "Screening Document..." },
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    modifier = Modifier.size(22.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Run document screening",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    letterSpacing = 0.1.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

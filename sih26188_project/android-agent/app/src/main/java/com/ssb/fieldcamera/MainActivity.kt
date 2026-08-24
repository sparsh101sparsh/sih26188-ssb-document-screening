package com.ssb.fieldcamera

import android.Manifest
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var previewView: PreviewView
    private lateinit var shutterButton: View
    private lateinit var shutterLabel: TextView
    private lateinit var connectionStatus: TextView
    private lateinit var statusMessage: TextView
    private lateinit var outboxCount: TextView
    private lateinit var modeSelfie: TextView
    private lateinit var modeDocument: TextView

    private lateinit var cameraExecutor: ExecutorService
    private var imageCapture: ImageCapture? = null
    private var cameraSelector: CameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA
    private var currentMode: CaptureMode = CaptureMode.SELFIE

    private val scope = MainScope()
    private lateinit var apiService: CompanionApiService
    private lateinit var outboxManager: OutboxManager
    private var lastUploadedSeq: Int = 0

    private enum class CaptureMode {
        SELFIE, DOCUMENT
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            startCamera()
        } else {
            Toast.makeText(this, "Camera permission is required for field screening", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        apiService = CompanionApiService(this)
        outboxManager = OutboxManager(this)
        cameraExecutor = Executors.newSingleThreadExecutor()

        bindViews()
        setupCameraModeToggle()
        setupShutterButton()
        setupSettingsDialog()
        checkCameraPermission()
        playStampIntroAnimation()

        // Defer background network polling to prevent UI thread frame drops
        window.decorView.postDelayed({
            startConnectionCheck()
            startOutboxSync()
        }, 1500)
    }

    private fun bindViews() {
        previewView = findViewById(R.id.previewView)
        shutterButton = findViewById(R.id.shutterButton)
        shutterLabel = findViewById(R.id.shutterLabel)
        connectionStatus = findViewById(R.id.connectionStatus)
        statusMessage = findViewById(R.id.statusMessage)
        outboxCount = findViewById(R.id.outboxCount)
        modeSelfie = findViewById(R.id.modeSelfie)
        modeDocument = findViewById(R.id.modeDocument)
    }


    private fun setupSettingsDialog() {
        connectionStatus.setOnClickListener {
            showServerConfigDialog()
        }
    }

    private fun showServerConfigDialog() {
        val input = EditText(this).apply {
            setText(apiService.getServerUrl())
            hint = "http://192.168.1.100:8000"
        }
        AlertDialog.Builder(this)
            .setTitle("Desktop Gateway Configuration")
            .setMessage("Enter Edge Gateway IP / Host URL:")
            .setView(input)
            .setPositiveButton("Connect") { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotEmpty()) {
                    apiService.setServerUrl(newUrl, this)
                    Toast.makeText(this, "Target Gateway updated: $newUrl", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun setupCameraModeToggle() {
        modeSelfie.setOnClickListener {
            currentMode = CaptureMode.SELFIE
            cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA
            updateModeUI()
            startCamera()
            statusMessage.text = "Position face in frame"
            shutterLabel.text = "📸 SNAP TRAVELER PHOTO"
        }

        modeDocument.setOnClickListener {
            currentMode = CaptureMode.DOCUMENT
            cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            updateModeUI()
            startCamera()
            statusMessage.text = "Position document in reticle"
            shutterLabel.text = "📄 CAPTURE DOCUMENT"
        }
    }

    private fun updateModeUI() {
        when (currentMode) {
            CaptureMode.SELFIE -> {
                modeSelfie.setBackgroundResource(R.drawable.mode_selected)
                modeSelfie.setTextColor(getColor(R.color.white))
                modeDocument.setBackgroundResource(android.R.color.transparent)
                modeDocument.setTextColor(getColor(R.color.text_secondary))
            }
            CaptureMode.DOCUMENT -> {
                modeDocument.setBackgroundResource(R.drawable.mode_selected)
                modeDocument.setTextColor(getColor(R.color.white))
                modeSelfie.setBackgroundResource(android.R.color.transparent)
                modeSelfie.setTextColor(getColor(R.color.text_secondary))
            }
        }
    }

    private fun setupShutterButton() {
        shutterButton.setOnClickListener {
            capturePhoto()
        }
    }

    private fun checkCameraPermission() {
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED -> {
                startCamera()
            }
            else -> {
                requestPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .setJpegQuality(85)
                .build()

            try {
                cameraProvider.unbindAll()
                val selectorToUse = when {
                    cameraProvider.hasCamera(cameraSelector) -> cameraSelector
                    cameraProvider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA) -> CameraSelector.DEFAULT_BACK_CAMERA
                    cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA) -> CameraSelector.DEFAULT_FRONT_CAMERA
                    else -> cameraSelector
                }
                cameraProvider.bindToLifecycle(
                    this,
                    selectorToUse,
                    preview,
                    imageCapture
                )
            } catch (exc: Exception) {
                Toast.makeText(this, "Camera initialization error: ${exc.message}", Toast.LENGTH_SHORT).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun capturePhoto() {
        val imageCapture = imageCapture ?: return

        statusMessage.text = "Capturing frame..."
        shutterButton.isEnabled = false

        imageCapture.takePicture(
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    val buffer = image.planes[0].buffer
                    val bytes = ByteArray(buffer.remaining())
                    buffer.get(bytes)
                    image.close()

                    scope.launch {
                        uploadPhoto(bytes)
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    statusMessage.text = "Capture error. Tap to retry."
                    shutterButton.isEnabled = true
                }
            }
        )
    }

    private suspend fun uploadPhoto(bytes: ByteArray) {
        statusMessage.text = "⚡ Sending to Desktop Terminal..."
        
        val captureType = if (currentMode == CaptureMode.SELFIE) "traveler_live" else "document"
        val result = apiService.uploadPhoto(this, bytes, captureType)

        withContext(Dispatchers.Main) {
            if (result.success) {
                lastUploadedSeq = result.sequenceId
                statusMessage.text = "✓ Sent to Desktop Terminal"
                shutterButton.isEnabled = true
                scope.launch {
                    delay(2500)
                    statusMessage.text = if (currentMode == CaptureMode.SELFIE) "Position face in frame" else "Position document in reticle"
                }
            } else {
                // Store in outbox for offline sync
                outboxManager.addToOutbox(bytes, captureType)
                statusMessage.text = "📦 Saved to Offline Outbox"
                shutterButton.isEnabled = true
                updateOutboxCount()
                scope.launch {
                    delay(2500)
                    statusMessage.text = if (currentMode == CaptureMode.SELFIE) "Position face in frame" else "Position document in reticle"
                }
            }
        }
    }

    private fun startConnectionCheck() {
        scope.launch {
            while (isActive) {
                val isOnline = apiService.checkConnection(this@MainActivity)
                withContext(Dispatchers.Main) {
                    updateConnectionStatus(isOnline)
                }
                delay(3000)
            }
        }
    }

    private fun updateConnectionStatus(isOnline: Boolean) {
        if (isOnline) {
            connectionStatus.text = "🟢 Connected to Desktop Terminal"
            connectionStatus.setTextColor(getColor(R.color.status_green))
        } else {
            connectionStatus.text = "⚠️ Offline (Local Outbox Ready)"
            connectionStatus.setTextColor(getColor(R.color.status_orange))
        }
    }

    private fun startOutboxSync() {
        scope.launch {
            while (isActive) {
                val pendingCount = outboxManager.getPendingCount()
                withContext(Dispatchers.Main) {
                    updateOutboxCount(pendingCount)
                }

                if (pendingCount > 0) {
                    val isOnline = apiService.checkConnection(this@MainActivity)
                    if (isOnline) {
                        outboxManager.syncPending { bytes, captureType ->
                            apiService.uploadPhoto(this@MainActivity, bytes, captureType)
                        }
                        withContext(Dispatchers.Main) {
                            updateOutboxCount(outboxManager.getPendingCount())
                        }
                    }
                }
                delay(4000)
            }
        }
    }


    private fun updateOutboxCount(count: Int = 0) {
        if (count > 0) {
            outboxCount.visibility = View.VISIBLE
            outboxCount.text = "$count in outbox"
        } else {
            outboxCount.visibility = View.GONE
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        scope.cancel()
    }

    override fun onResume() {
        super.onResume()
        if (::cameraExecutor.isInitialized) {
            startCamera()
        }
    }

    private fun playStampIntroAnimation() {
        val overlay = findViewById<View>(R.id.stampIntroOverlay) ?: return
        val stampLogo = findViewById<ImageView>(R.id.stampLogo) ?: return
        val shockwave1 = findViewById<View>(R.id.shockwaveRing) ?: return
        val shockwave2 = findViewById<View>(R.id.shockwaveRing2) ?: return
        val shockwave3 = findViewById<View>(R.id.shockwaveRing3) ?: return
        val stampTitle = findViewById<TextView>(R.id.stampTitle) ?: return
        val stampSubtitle = findViewById<TextView>(R.id.stampSubtitle) ?: return
        val stampAgency = findViewById<TextView>(R.id.stampAgency) ?: return

        // Hide underlying workspace views completely during intro
        previewView.alpha = 0f
        shutterButton.alpha = 0f
        shutterLabel.alpha = 0f
        connectionStatus.alpha = 0f
        statusMessage.alpha = 0f

        // Initial punch state
        stampLogo.scaleX = 3.4f
        stampLogo.scaleY = 3.4f
        stampLogo.rotation = -16f
        stampLogo.alpha = 0.1f
        shockwave1.scaleX = 0.35f; shockwave1.scaleY = 0.35f; shockwave1.alpha = 0f
        shockwave2.scaleX = 0.35f; shockwave2.scaleY = 0.35f; shockwave2.alpha = 0f
        shockwave3.scaleX = 0.35f; shockwave3.scaleY = 0.35f; shockwave3.alpha = 0f

        val revealWorkspace = {
            previewView.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(1000).start()
            shutterButton.animate().alpha(1f).setDuration(1000).start()
            shutterLabel.animate().alpha(1f).setDuration(1000).start()
            connectionStatus.animate().alpha(1f).setDuration(1000).start()
            statusMessage.animate().alpha(1f).setDuration(1000).start()
        }

        // Allow instant dismiss on tap
        overlay.setOnClickListener {
            revealWorkspace()
            overlay.animate().alpha(0f).scaleX(1.06f).scaleY(1.06f).setDuration(400).withEndAction {
                overlay.visibility = View.GONE
            }.start()
        }

        // Slow cinematic stamp descent & heavy slam with GPU layer promotion
        overlay.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        stampLogo.animate()
            .scaleX(1.0f)
            .scaleY(1.0f)
            .rotation(0f)
            .alpha(1.0f)
            .setDuration(1600)
            .withLayer()
            .setInterpolator(android.view.animation.OvershootInterpolator(1.3f))
            .withEndAction {
                // Heavy haptic impact
                overlay.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS)

                // Expand triple slow shockwaves
                shockwave1.alpha = 0.95f
                shockwave1.animate()
                    .scaleX(4.8f).scaleY(4.8f).alpha(0f)
                    .setDuration(2200)
                    .withLayer()
                    .setInterpolator(android.view.animation.DecelerateInterpolator())
                    .start()

                shockwave2.postDelayed({
                    shockwave2.alpha = 0.75f
                    shockwave2.animate()
                        .scaleX(4.8f).scaleY(4.8f).alpha(0f)
                        .setDuration(2200)
                        .withLayer()
                        .setInterpolator(android.view.animation.DecelerateInterpolator())
                        .start()
                }, 250)

                shockwave3.postDelayed({
                    shockwave3.alpha = 0.5f
                    shockwave3.animate()
                        .scaleX(4.8f).scaleY(4.8f).alpha(0f)
                        .setDuration(2200)
                        .withLayer()
                        .setInterpolator(android.view.animation.DecelerateInterpolator())
                        .start()
                }, 500)

                // Reveal Titles with smooth cinematic fade
                stampTitle.animate().alpha(1.0f).translationY(0f).setDuration(800).withLayer().start()
                stampSubtitle.animate().alpha(1.0f).translationY(0f).setDuration(800).setStartDelay(200).withLayer().start()
                stampAgency.animate().alpha(1.0f).translationY(0f).setDuration(800).setStartDelay(400).withLayer().start()

                // Hold for 3.0s, then smooth dissolve into live camera workspace
                overlay.postDelayed({
                    revealWorkspace()
                    overlay.animate()
                        .alpha(0f)
                        .scaleX(1.08f)
                        .scaleY(1.08f)
                        .setDuration(1000)
                        .withLayer()
                        .setInterpolator(android.view.animation.AccelerateInterpolator())
                        .withEndAction {
                            overlay.setLayerType(View.LAYER_TYPE_NONE, null)
                            overlay.visibility = View.GONE
                        }
                        .start()
                }, 3000)
            }
            .start()
    }
}

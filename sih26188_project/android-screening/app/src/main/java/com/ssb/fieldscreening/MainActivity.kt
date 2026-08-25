package com.ssb.fieldscreening

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.ssb.fieldscreening.ui.MainScreen
import com.ssb.fieldscreening.ui.theme.SsbInspectionTheme
import com.ssb.fieldscreening.ui.viewmodel.SsbScreeningViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: SsbScreeningViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SsbInspectionTheme {
                MainScreen(viewModel = viewModel)
            }
        }
    }
}


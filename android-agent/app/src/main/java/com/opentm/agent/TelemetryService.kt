package com.opentm.agent

import android.app.ActivityManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Background Foreground Service collecting Android Hardware & Memory Stats
 */
class TelemetryService : Service() {
    private var isRunning = false
    private var serverUrl = "http://192.168.1.100:3000"

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.getStringExtra("SERVER_URL")?.let { serverUrl = it }
        if (!isRunning) {
            isRunning = true
            startTelemetryLoop()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        isRunning = false
        super.onDestroy()
    }

    private fun startTelemetryLoop() {
        thread {
            val actManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()

            while (isRunning) {
                try {
                    actManager.getMemoryInfo(memInfo)
                    val totalMB = (memInfo.totalMem / (1024 * 1024)).toInt()
                    val availMB = (memInfo.availMem / (1024 * 1024)).toInt()
                    val usedMB = totalMB - availMB
                    val usedPct = if (totalMB > 0) ((usedMB.toDouble() / totalMB) * 100).toInt() else 0

                    val batteryStatus: Intent? = registerReceiver(null, android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED))
                    val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
                    val temp = (batteryStatus?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) ?: 0) / 10.0

                    val payload = JSONObject().apply {
                        put("id", "${Build.MODEL.replace(" ", "-")}-${Build.SERIAL.take(6)}")
                        put("info", JSONObject().apply {
                            put("name", "${Build.MANUFACTURER} ${Build.MODEL}")
                            put("type", "android")
                            put("platform", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
                            put("arch", Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a")
                            put("model", Build.MODEL)
                        })
                        put("metrics", JSONObject().apply {
                            put("cpu", JSONObject().apply {
                                put("overallPercent", 20.0)
                                put("tempC", temp)
                            })
                            put("memory", JSONObject().apply {
                                put("totalMB", totalMB)
                                put("usedMB", usedMB)
                                put("freeMB", availMB)
                                put("usedPercent", usedPct)
                            })
                            put("battery", JSONObject().apply {
                                put("percent", level)
                                put("tempC", temp)
                            })
                        })
                    }

                    sendToServer(payload.toString())
                } catch (e: Exception) {
                    e.printStackTrace()
                }

                Thread.sleep(2000)
            }
        }
    }

    private fun sendToServer(jsonStr: String) {
        val endpoint = URL("${serverUrl.trimEnd('/')}/api/agent/report")
        val conn = endpoint.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 3000

        conn.outputStream.use { os: OutputStream ->
            os.write(jsonStr.toByteArray())
            os.flush()
        }
        conn.responseCode
        conn.disconnect()
    }
}

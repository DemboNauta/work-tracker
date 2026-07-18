package com.worktracker.fichaje.data

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val name: String, val password: String)

@Serializable
data class UserDto(val id: Int, val name: String)

@Serializable
data class LoginResponse(val token: String, val user: UserDto)

@Serializable
data class DayDto(
    val date: String,
    val weekdayShort: String,
    val totalMin: Int = 0,
    val nightMin: Int = 0,
    val isToday: Boolean = false,
)

@Serializable
data class WeekResponse(
    val weekStart: String? = null,
    val days: List<DayDto> = emptyList(),
    val weekTotalMin: Int = 0,
    val weekNightMin: Int = 0,
    val weekComplementaryMin: Int = 0,
    val weeklyLimitMin: Int = 0,
)

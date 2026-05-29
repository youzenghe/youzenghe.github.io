Option Explicit

Dim shell
Dim command

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "D:\acg-blog"

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""D:\acg-blog\scripts\sync_local.ps1"" -LogPath ""C:\Users\ASUS\acg-blog-sync.log"""
shell.Run command, 0, False

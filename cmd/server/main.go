package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"lessup/webrtc/internal/signal"
)

func main() {
	hub := signal.NewHub()
	http.HandleFunc("/ws", hub.HandleWS)

	webDir := filepath.Join("web")
	fs := http.FileServer(http.Dir(webDir))
	http.Handle("/", fs)

	addr := ":8080"
	if v := os.Getenv("ADDR"); v != "" {
		addr = v
	}
	log.Println("listening", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

package com.sena.appintegracion;

import androidx.annotation.NonNull;

public class Usuario {
    private final int id;
    private final String nombre;
    private final String email;
    private final String rol;

    public Usuario(int id, String nombre, String email, String rol) {
        this.id = id;
        this.nombre = nombre;
        this.email = email;
        this.rol = rol;
    }

    public int getId() { return id; }
    public String getNombre() { return nombre; }
    public String getEmail() { return email; }
    public String getRol() { return rol; }

    @NonNull
    @Override
    public String toString() {
        return "ID: " + getId() + " | " + getNombre() + "\nEmail: " + getEmail() + " | Rol: " + getRol();
    }
}
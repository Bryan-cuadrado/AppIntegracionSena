package com.sena.appintegracion;

import java.util.ArrayList;
import java.util.List;

public class UsuarioRepository {
    private static UsuarioRepository instance;
    private final List<Usuario> listaUsuarios;
    private int contadorId = 1;

    private UsuarioRepository() {
        listaUsuarios = new ArrayList<>();
        registrarUsuario("Administrador SENA", "admin@sena.edu.co", "ADMIN");
    }

    public static synchronized UsuarioRepository getInstance() {
        if (instance == null) {
            instance = new UsuarioRepository();
        }
        return instance;
    }

    public Usuario registrarUsuario(String nombre, String email, String rol) {
        if (nombre == null || nombre.trim().isEmpty() || email == null || email.trim().isEmpty()) {
            return null;
        }
        String rolFinal = (rol == null || rol.trim().isEmpty()) ? "USER" : rol.trim().toUpperCase();
        Usuario nuevo = new Usuario(contadorId++, nombre.trim(), email.trim(), rolFinal);
        listaUsuarios.add(nuevo);
        return nuevo;
    }

    public List<Usuario> obtenerTodos() {
        return new ArrayList<>(listaUsuarios);
    }

    public boolean eliminarPorId(int id) {
        return listaUsuarios.removeIf(u -> u.getId() == id);
    }

    public void reiniciarDatosParaPruebas() {
        listaUsuarios.clear();
        contadorId = 1;
        registrarUsuario("Administrador SENA", "admin@sena.edu.co", "ADMIN");
    }
}
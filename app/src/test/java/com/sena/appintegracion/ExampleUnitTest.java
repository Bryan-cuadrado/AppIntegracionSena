package com.sena.appintegracion;

import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class ExampleUnitTest {

    private UsuarioRepository repository;

    @Before
    public void setUp() {
        repository = UsuarioRepository.getInstance();
        repository.reiniciarDatosParaPruebas();
    }

    @Test
    public void testRegistroUsuarioExitoso() {
        Usuario nuevo = repository.registrarUsuario("Bryan Cuadrado", "bryan@sena.edu.co", "ADMIN");
        assertNotNull(nuevo);
        assertEquals(2, repository.obtenerTodos().size());
    }

    @Test
    public void testValidacionCamposObligatorios() {
        Usuario invalido = repository.registrarUsuario("", "", "USER");
        assertNull(invalido);
    }

    @Test
    public void testEliminarUsuarioPorId() {
        boolean eliminado = repository.eliminarPorId(1);
        assertTrue(eliminado);
        assertEquals(0, repository.obtenerTodos().size());
    }
}
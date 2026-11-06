package com.sena.appintegracion;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private EditText etNombre, etEmail, etRol, etIdEliminar;
    private TextView tvListaUsuarios;
    private UsuarioRepository repository;

    @SuppressLint("SetTextI18n")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        repository = UsuarioRepository.getInstance();

        etNombre = findViewById(R.id.etNombre);
        etEmail = findViewById(R.id.etEmail);
        etRol = findViewById(R.id.etRol);
        etIdEliminar = findViewById(R.id.etIdEliminar);
        tvListaUsuarios = findViewById(R.id.tvListaUsuarios);

        Button btnRegistrar = findViewById(R.id.btnRegistrar);
        Button btnEliminar = findViewById(R.id.btnEliminar);

        actualizarVistaLista();

        btnRegistrar.setOnClickListener(v -> {
            String nombre = etNombre.getText().toString();
            String email = etEmail.getText().toString();
            String rol = etRol.getText().toString();

            Usuario creado = repository.registrarUsuario(nombre, email, rol);
            if (creado != null) {
                Toast.makeText(this, "Usuario creado exitosamente (ID: " + creado.getId() + ")", Toast.LENGTH_SHORT).show();
                etNombre.setText("");
                etEmail.setText("");
                etRol.setText("");
                actualizarVistaLista();
            } else {
                Toast.makeText(this, "Error 400: Nombre y correo son obligatorios", Toast.LENGTH_SHORT).show();
            }
        });

        btnEliminar.setOnClickListener(v -> {
            String idTexto = etIdEliminar.getText().toString().trim();
            if (idTexto.isEmpty()) {
                Toast.makeText(this, "Ingrese un ID válido para eliminar", Toast.LENGTH_SHORT).show();
                return;
            }
            int id = Integer.parseInt(idTexto);
            boolean eliminado = repository.eliminarPorId(id);
            if (eliminado) {
                Toast.makeText(this, "Usuario ID " + id + " eliminado correctamente", Toast.LENGTH_SHORT).show();
                etIdEliminar.setText("");
                actualizarVistaLista();
            } else {
                Toast.makeText(this, "Error 404: Usuario no encontrado", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void actualizarVistaLista() {
        List<Usuario> usuarios = repository.obtenerTodos();
        StringBuilder sb = new StringBuilder();
        for (Usuario u : usuarios) {
            sb.append(u.toString()).append("\n-------------------------\n");
        }
        tvListaUsuarios.setText(sb.length() > 0 ? sb.toString() : "No hay usuarios registrados.");
    }
}
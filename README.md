Instrucciones para ejecutar la aplicación (para principiantes)
1. Crear un entorno virtual
Un entorno virtual es simplemente un espacio aislado donde puedes instalar las bibliotecas necesarias para tu proyecto sin afectar al resto de tu sistema. Para crearlo:

Abre la terminal o línea de comandos
Navega hasta el directorio raíz de tu proyecto
Ejecuta:

python -m venv venv

2. Activar el entorno virtual
Dependiendo de tu sistema operativo:
En Windows:

venv\Scripts\activate

En macOS/Linux:

source venv/bin/activate

Sabrás que está activado porque verás (venv) al inicio de la línea de comandos.
3. Instalar dependencias
Con el entorno virtual activado, instala los paquetes necesarios:

pip install Flask Flask-SQLAlchemy psycopg2-binary python-dotenv

4. Configurar la base de datos PostgreSQL
Necesitas tener PostgreSQL instalado en tu computadora. Si no lo tienes:

Descárgalo e instálalo desde postgresql.org
Durante la instalación, establece una contraseña para el usuario 'postgres'

Una vez instalado:

Abre pgAdmin (viene con PostgreSQL) o una herramienta similar
Crea una nueva base de datos llamada "organigrama"
Abiri el archivo llamado arch.env en el directorio raíz del proyecto con:

Copiar
DATABASE_URL=postgresql://postgres:tu_contraseña@localhost/organigrama
(Reemplaza "tu_contraseña" con la contraseña que estableciste)

5. Inicializar la base de datos
Con el entorno virtual activado, ejecuta:

flask db init
flask db migrate -m "Estructura inicial"
flask db upgrade

Si obtienes un error diciendo que 'flask' no se reconoce como comando, prueba con:

python -m flask db init
python -m flask db migrate -m "Estructura inicial"
python -m flask db upgrade

6. Ejecutar la aplicación
Finalmente, para iniciar la aplicación:

python run.py

7. Acceder a la aplicación
Abre tu navegador web y ve a:

http://localhost:5000

Deberías ver la interfaz de tu aplicación de organigramas.

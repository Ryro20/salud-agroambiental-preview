const root = document.querySelector("[data-comments]");

if (root) {
  const status = root.querySelector("[data-comments-status]");
  const authPanel = root.querySelector("[data-comments-auth]");
  const userLabel = root.querySelector("[data-comments-user]");
  const signInButton = root.querySelector("[data-comments-sign-in]");
  const signOutButton = root.querySelector("[data-comments-sign-out]");
  const form = root.querySelector("[data-comments-form]");
  const textField = form.querySelector('[name="text"]');
  const consentField = form.querySelector('[name="consent"]');
  const list = root.querySelector("[data-comments-list]");
  const collectionName = root.dataset.collection;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function showComments(comments) {
    list.replaceChildren();
    if (!comments.length) {
      const emptyState = document.createElement("li");
      emptyState.className = "comments__empty";
      emptyState.textContent = "Todavía no hay comentarios. ¡Sé la primera persona en participar!";
      list.append(emptyState);
      return;
    }

    comments.forEach((comment) => {
      const item = document.createElement("li");
      item.className = "comments__item";

      const header = document.createElement("div");
      header.className = "comments__item-header";
      const author = document.createElement("strong");
      author.textContent = comment.authorName;
      const date = document.createElement("time");
      const createdAt = comment.createdAt?.toDate?.();
      if (createdAt) {
        date.dateTime = createdAt.toISOString();
        date.textContent = new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(createdAt);
      } else {
        date.textContent = "Ahora";
      }

      const body = document.createElement("p");
      body.textContent = comment.text;
      header.append(author, date);
      item.append(header, body);
      list.append(item);
    });
  }

  async function start() {
    try {
      const version = "12.19.0";
      const [appSdk, authSdk, firestoreSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
      ]);
      const firebaseApp = appSdk.initializeApp({
        apiKey: root.dataset.apiKey,
        authDomain: root.dataset.authDomain,
        projectId: root.dataset.projectId,
        appId: root.dataset.appId,
      });
      const auth = authSdk.getAuth(firebaseApp);
      const db = firestoreSdk.getFirestore(firebaseApp);

      authPanel.hidden = false;
      setStatus("Cargando comentarios…");

      firestoreSdk.onSnapshot(
        firestoreSdk.query(
          firestoreSdk.collection(db, collectionName),
          firestoreSdk.where("postPath", "==", window.location.pathname),
          firestoreSdk.orderBy("createdAt", "desc"),
          firestoreSdk.limit(50),
        ),
        (snapshot) => {
          showComments(snapshot.docs.map((document) => document.data()));
          setStatus(snapshot.size === 50
            ? "Mostrando los 50 comentarios más recientes."
            : `${snapshot.size} ${snapshot.size === 1 ? "comentario" : "comentarios"} en esta publicación.`);
        },
        (error) => {
          console.error("No se pudieron cargar los comentarios de Firebase.", error);
          setStatus("No se pudieron cargar los comentarios. Inténtalo de nuevo más tarde.", true);
        },
      );

      authSdk.onAuthStateChanged(auth, (user) => {
        const signedIn = Boolean(user);
        signInButton.hidden = signedIn;
        signOutButton.hidden = !signedIn;
        form.hidden = !signedIn;
        userLabel.textContent = signedIn ? `Has iniciado sesión como ${user.displayName || "usuario de Google"}.` : "";
      });

      signInButton.addEventListener("click", async () => {
        signInButton.disabled = true;
        try {
          await authSdk.signInWithPopup(auth, new authSdk.GoogleAuthProvider());
          setStatus("Has iniciado sesión. Ya puedes publicar tu comentario.");
        } catch (error) {
          console.error("No se pudo iniciar sesión con Google.", error);
          setStatus(error.code === "auth/popup-closed-by-user"
            ? "Se cerró la ventana de inicio de sesión antes de terminar."
            : "No se pudo iniciar sesión con Google. Comprueba la configuración e inténtalo de nuevo.", true);
        } finally {
          signInButton.disabled = false;
        }
      });

      signOutButton.addEventListener("click", async () => {
        try {
          await authSdk.signOut(auth);
          setStatus("Has cerrado sesión.");
        } catch (error) {
          console.error("No se pudo cerrar la sesión de Google.", error);
          setStatus("No se pudo cerrar la sesión. Inténtalo de nuevo.", true);
        }
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const user = auth.currentUser;
        const text = textField.value.trim();
        if (!user || text.length < 2 || !consentField.checked) return;

        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;
        setStatus("Publicando tu comentario…");
        try {
          await firestoreSdk.addDoc(firestoreSdk.collection(db, collectionName), {
            postPath: window.location.pathname,
            authorName: user.displayName || "Usuario de Google",
            text,
            createdAt: firestoreSdk.serverTimestamp(),
          });
          form.reset();
          setStatus("Tu comentario se ha publicado.");
        } catch (error) {
          console.error("No se pudo publicar el comentario en Firebase.", error);
          setStatus("No se pudo publicar el comentario. Comprueba tu conexión e inténtalo de nuevo.", true);
        } finally {
          submitButton.disabled = false;
        }
      });
    } catch (error) {
      console.error("No se pudo inicializar Firebase para los comentarios.", error);
      setStatus("No se pudieron iniciar los comentarios. Inténtalo de nuevo más tarde.", true);
    }
  }

  start();
}

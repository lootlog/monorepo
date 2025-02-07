import "./App.css";
import { authClient } from "./lib/auth";

function App() {
  const { data: session } = authClient.useSession();

  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: "http://localhost:5173",
    });
  };

  interface SignUpFormElements extends HTMLFormControlsCollection {
    email: HTMLInputElement;
    password: HTMLInputElement;
  }

  interface SignUpForm extends HTMLFormElement {
    readonly elements: SignUpFormElements;
  }

  const handleSignUp = (e: React.FormEvent<SignUpForm>) => {
    e.preventDefault();

    const email = e.currentTarget.elements.email.value as string;
    const password = e.currentTarget.elements.password.value as string;

    authClient.signUp.email({
      email,
      password,
      name: "test",
    });
  };

  const getData = async () => {
    const res = await fetch("http://localhost/api/auth/token", {
      headers: {
        Authorization: `Bearer ${session?.session?.token}`,
      },
    });
    const data = (await res.json()) as { token: string };

    const res2 = await fetch("http://localhost/api/search/players", {
      headers: { Authorization: `Bearer ${data.token}` },
    });
  };

  return (
    <>
      <button onClick={handleSignIn}>login</button>
      <button onClick={getData}>get data</button>

      <form onSubmit={handleSignUp}>
        <input type="email" name="email" />
        <input type="password" name="password" />
        <button>signup</button>
      </form>
    </>
  );
}

export default App;

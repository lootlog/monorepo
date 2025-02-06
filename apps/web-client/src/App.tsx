import "./App.css";
import { authClient } from "./lib/auth";

function App() {
  const { data: session, isPending } = authClient.useSession();

  console.log(session);

  const handleSignIn = async () => {
    await authClient.signIn.email({
      email: "test@test.pl",
      password: "kamilo5",
    });

    console.log("signed in");
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
      name: "chuj",
    });
  };

  const getData = async () => {
    const res = await fetch("http://localhost:4001/api/auth/token", {
      headers: {
        Authorization: `Bearer ${session?.session?.token}`,
      },
    });
    const data = (await res.json()) as { token: string };

    console.log(data);

    const res2 = await fetch("http://localhost:4002/players", {
      headers: { Authorization: `Bearer ${data.token}` },
    });

    console.log(await res2.json());
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

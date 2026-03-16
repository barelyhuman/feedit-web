import { useSignal } from "@preact/signals";
import { authClient } from "../../lib/auth_client";
import {
  sync as syncAuthState,
  useEnforceUnAuthenticated,
} from "../store/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";

export default () => {
  const loading = useSignal(false);
  const { loading: userLoading } = useEnforceUnAuthenticated();

  const onSubmit = async (e) => {
    try {
      loading.value = true;
      e.preventDefault();
      const form = new FormData(e.target.closest("form"));
      const result = await authClient.signUp.email({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      });
      if (result.error) {
        toast(result.error?.message);
      } else if (result.data.token) {
        toast("Logging you in...");
        syncAuthState();
        setTimeout(() => {
          window.location.href = "/app";
        }, 500);
      }
    } catch (err) {
      toast("Oops! Something went wrong...");
    } finally {
      loading.value = false;
    }
  };

  if (userLoading) return <></>;

  return (
    <div class="max-w-4xl mx-auto flex flex-col justify-center items-center min-h-[100vh] gap-3">
      <div class={cn("flex flex-col gap-6")}>
        <Card>
          <CardHeader>
            <CardTitle class="text-2xl">Sign Up</CardTitle>
            <CardDescription>
              Enter your email below to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit}>
              <div class="flex flex-col gap-6">
                <div class="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    name="name"
                    placeholder="Reaper"
                    required
                  />
                </div>
                <div class="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="m@example.com"
                    required
                  />
                </div>
                <div class="grid gap-2">
                  <div class="flex items-center">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input
                    name="password"
                    id="password"
                    type="password"
                    required
                  />
                </div>
                <Button type="submit" class="w-full" disabled={loading.value}>
                  {loading.value ? "Creating..." : "Create Account"}
                </Button>
              </div>
              <div class="mt-4 text-center text-sm">
                Already have an account?{" "}
                <a href="/login" class="underline underline-offset-4">
                  Login
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../src/client/contexts/AuthContext";
import axios from "axios";

jest.mock("axios");

const TestComponent = () => {
  const { user, login, register, logout, loading } = useAuth();
  return (
    <div>
      {loading ? (
        <div data-testid="loading">Loading...</div>
      ) : (
        <div data-testid="user">{user ? user.email : "ユーザーなし"}</div>
      )}
      <button onClick={() => login("test@example.com", "password")}>
        ログイン
      </button>
      <button
        onClick={() => register("testuser", "test@example.com", "password")}
      >
        登録
      </button>
      <button onClick={logout}>ログアウト</button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    delete axios.defaults.headers.common["Authorization"];
  });

  it("トークンがない場合はユーザーなしを表示する", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("ユーザーなし");
    });
  });

  it("トークンがある場合、ユーザー情報を取得する", async () => {
    localStorage.setItem("token", "fake-token");
    axios.get.mockResolvedValueOnce({ data: { email: "test@example.com" } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    });
    expect(axios.get).toHaveBeenCalledWith("/api/auth/profile");
  });

  it("ログイン、ログアウト、登録の機能を提供する", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        user: { email: "test@example.com" },
        token: "fake-token",
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // ログイン
    await act(async () => {
      screen.getByText("ログイン").click();
    });
    expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
    expect(localStorage.getItem("token")).toBe("fake-token");

    // ログアウト
    await act(async () => {
      screen.getByText("ログアウト").click();
    });
    expect(screen.getByTestId("user")).toHaveTextContent("ユーザーなし");
    expect(localStorage.getItem("token")).toBeNull();

    // 登録
    axios.post.mockResolvedValueOnce({
      data: {
        user: { email: "newuser@example.com" },
        token: "new-fake-token",
      },
    });
    await act(async () => {
      screen.getByText("登録").click();
    });
    expect(screen.getByTestId("user")).toHaveTextContent("newuser@example.com");
    expect(localStorage.getItem("token")).toBe("new-fake-token");
  });

  it("ユーザー情報の取得に失敗した場合、エラーをログに記録する", async () => {
    localStorage.setItem("token", "fake-token");
    axios.get.mockRejectedValueOnce(new Error("Failed to fetch user"));
    console.error = jest.fn();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Error fetching user:",
        expect.any(Error),
      );
      expect(screen.getByTestId("user")).toHaveTextContent("ユーザーなし");
    });
  });
});

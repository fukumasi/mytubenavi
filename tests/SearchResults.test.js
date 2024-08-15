import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import axios from "axios";
import SearchResults from "../src/client/components/SearchResults";

jest.mock("axios");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

const renderWithRouter = (ui, { route = "/" } = {}) => {
  const navigate = jest.fn();
  useNavigate.mockReturnValue(navigate);
  return {
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>,
    ),
    navigate,
  };
};

describe("SearchResults", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({
      data: {
        videos: [
          {
            id: "1",
            title: "Test Video 1",
            thumbnail: "thumb1.jpg",
            channel: "Channel 1",
            views: 1000,
            uploadDate: "2023-08-01",
          },
          {
            id: "2",
            title: "Test Video 2",
            thumbnail: "thumb2.jpg",
            channel: "Channel 2",
            views: 2000,
            uploadDate: "2023-08-02",
          },
        ],
        totalPages: 5,
      },
    });
  });

  test("renders search results", async () => {
    await act(async () => {
      renderWithRouter(<SearchResults />, { route: "/search?q=test" });
    });

    await waitFor(() => {
      expect(screen.getByText("「test」の検索結果")).toBeInTheDocument();
      expect(screen.getByText("Test Video 1")).toBeInTheDocument();
      expect(screen.getByText("Test Video 2")).toBeInTheDocument();
    });
  });

  test("handles filter changes", async () => {
    await act(async () => {
      renderWithRouter(<SearchResults />, { route: "/search?q=test" });
    });

    await waitFor(() => {
      const sortSelect = screen.getByLabelText("並び替え");
      fireEvent.change(sortSelect, { target: { value: "views" } });
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("sort=views"),
      );
    });
  });

  test("handles search input", async () => {
    const { navigate } = renderWithRouter(<SearchResults />, {
      route: "/search?q=test",
    });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText("動画を検索...");
      fireEvent.change(searchInput, { target: { value: "new search" } });
      fireEvent.submit(searchInput.closest("form"));
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/search?q=new search");
    });
  });

  test("displays loading state", async () => {
    jest.useFakeTimers();
    axios.get.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: { videos: [], totalPages: 0 } }),
            1000,
          ),
        ),
    );

    render(
      <MemoryRouter initialEntries={["/search?q=test"]}>
        <SearchResults />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test("displays error message", async () => {
    axios.get.mockRejectedValueOnce(new Error("API Error"));

    await act(async () => {
      renderWithRouter(<SearchResults />, { route: "/search?q=test" });
    });

    await waitFor(() => {
      expect(
        screen.getByText("エラーが発生しました。後でもう一度お試しください。"),
      ).toBeInTheDocument();
    });
  });
});

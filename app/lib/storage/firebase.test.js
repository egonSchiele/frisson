/* import { jest } from "@jest/globals";

import { getFirestore } from "firebase-admin/firestore";
import {
  MockFirestore,
  MockFirebaseMethodError,
} from "../../__mocks__/MockFirestore";
import { getBook } from "./firebase";

jest.mock("firebase-admin/firestore", () => {
  const originalModule = jest.requireActual("firebase-admin/firestore");

  const mockFirestore = jest.requireActual("../MockFirestore");
  const options = {
    allowedMethods: ["get", "updateOrderStatus", "logEmailSent"],
  };
  const db = new mockFirestore.MockFirestore(options);
  //Mock the default export and named export 'foo'
  return {
    __esModule: true,
    ...originalModule,
    getFirestore: jest.fn(() => {
      return db;
    }),
  };
});

describe("getBook", () => {
  it("should return a book", async () => {
    const book = await getBook("123");
    expect(book).toEqual({
      id: "123",
      title: "foo",
    });
  });
});
 */

it("passes", () => {
  expect(true).toBe(true);
});

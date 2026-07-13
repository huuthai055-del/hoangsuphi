import { InvalidRatingError } from './reviews.errors';

export class ReviewRating {
  private readonly value: number;

  private constructor(value: number) {
    if (value < 1 || value > 5 || !Number.isInteger(value)) {
      throw new InvalidRatingError(value);
    }
    this.value = value;
  }

  public static create(value: number): ReviewRating {
    return new ReviewRating(value);
  }

  public getValue(): number {
    return this.value;
  }

  public equals(other: ReviewRating): boolean {
    return this.value === other.getValue();
  }
}

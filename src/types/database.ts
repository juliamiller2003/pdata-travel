export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TripStatus = "planning" | "ongoing" | "completed" | "cancelled";
export type Mood = "amazing" | "good" | "okay" | "tough" | "terrible";
export type MapView = "world" | "country";

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          destination: string;
          country_code: string | null;
          country_codes: string[];
          budget: number | null;
          start_date: string | null;
          end_date: string | null;
          cover_photo_url: string | null;
          photos: string[];
          photo_captions: Json;
          external_link: string | null;
          notes: string | null;
          status: TripStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          destination: string;
          country_code?: string | null;
          country_codes?: string[];
          budget?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          cover_photo_url?: string | null;
          photos?: string[];
          photo_captions?: Json;
          external_link?: string | null;
          notes?: string | null;
          status?: TripStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          destination?: string;
          country_code?: string | null;
          country_codes?: string[];
          budget?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          cover_photo_url?: string | null;
          photos?: string[];
          photo_captions?: Json;
          external_link?: string | null;
          notes?: string | null;
          status?: TripStatus;
          updated_at?: string;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      itinerary_days: {
        Row: {
          id: string;
          trip_id: string;
          day_number: number;
          date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          day_number: number;
          date?: string | null;
          created_at?: string;
        };
        Update: {
          day_number?: number;
          date?: string | null;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      activities: {
        Row: {
          id: string;
          day_id: string;
          time: string | null;
          title: string;
          notes: string | null;
          place_name: string | null;
          lat: number | null;
          lng: number | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          day_id: string;
          time?: string | null;
          title: string;
          notes?: string | null;
          place_name?: string | null;
          lat?: number | null;
          lng?: number | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          time?: string | null;
          title?: string;
          notes?: string | null;
          place_name?: string | null;
          lat?: number | null;
          lng?: number | null;
          order_index?: number;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      journal_entries: {
        Row: {
          id: string;
          trip_id: string;
          day_number: number | null;
          content: string;
          photos: string[];
          mood: Mood | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          day_number?: number | null;
          content?: string;
          photos?: string[];
          mood?: Mood | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          day_number?: number | null;
          content?: string;
          photos?: string[];
          mood?: Mood | null;
          updated_at?: string;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      expenses: {
        Row: {
          id: string;
          trip_id: string;
          title: string;
          amount: number;
          category: string;
          date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          title: string;
          amount: number;
          category?: string;
          date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          amount?: number;
          category?: string;
          date?: string | null;
          notes?: string | null;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      flights: {
        Row: {
          id: string;
          trip_id: string;
          flight_number: string;
          airline: string | null;
          departure_airport: string | null;
          departure_city: string | null;
          departure_iata: string | null;
          departure_time: string | null;
          arrival_airport: string | null;
          arrival_city: string | null;
          arrival_iata: string | null;
          arrival_time: string | null;
          flight_date: string;
          status: string | null;
          distance_miles: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          flight_number: string;
          airline?: string | null;
          departure_airport?: string | null;
          departure_city?: string | null;
          departure_iata?: string | null;
          departure_time?: string | null;
          arrival_airport?: string | null;
          arrival_city?: string | null;
          arrival_iata?: string | null;
          arrival_time?: string | null;
          flight_date: string;
          status?: string | null;
          distance_miles?: number | null;
          created_at?: string;
        };
        Update: {
          flight_number?: string;
          airline?: string | null;
          departure_airport?: string | null;
          departure_city?: string | null;
          departure_iata?: string | null;
          departure_time?: string | null;
          arrival_airport?: string | null;
          arrival_city?: string | null;
          arrival_iata?: string | null;
          arrival_time?: string | null;
          flight_date?: string;
          status?: string | null;
          distance_miles?: number | null;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
      user_settings: {
        Row: {
          user_id: string;
          map_view: MapView;
          home_country_code: string | null;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          map_view?: MapView;
          home_country_code?: string | null;
          updated_at?: string;
        };
        Update: {
          map_view?: MapView;
          home_country_code?: string | null;
          updated_at?: string;
        };
        Relationships: {
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
// Convenience row types
export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type ItineraryDay = Database["public"]["Tables"]["itinerary_days"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type JournalEntry = Database["public"]["Tables"]["journal_entries"]["Row"];
export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
export type Flight = Database["public"]["Tables"]["flights"]["Row"];

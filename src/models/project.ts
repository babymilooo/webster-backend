import { HydratedDocument, Schema, Types, model } from "mongoose";

export interface ISchemaProject {
  title?: string;
  pictures: string[];
  owner: Types.ObjectId;
  projectJSON?: string;
}

const projectSchema = new Schema<ISchemaProject>({
  title: {
    type: String,
    default: "",
    trim: true,
  },
  pictures: {
    type: [String],
    default: []
  },
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  projectJSON: {
    type: String
  }
}, {
  timestamps: true
});


export const Project = model<ISchemaProject>("Project", projectSchema);

export type IProject = HydratedDocument<ISchemaProject>;
